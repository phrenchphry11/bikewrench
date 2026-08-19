import { describe, expect, it } from 'vitest'
import { fetchNearbyShops, geocode, haversineMiles, mapOverpassShops } from './shops'

const ORIGIN = { lat: 40.0, lon: -105.0 }

function el(overrides: object = {}) {
  return {
    type: 'node',
    id: 1,
    lat: 40.01,
    lon: -105.0,
    tags: {
      name: 'Alpha Cycles',
      'addr:housenumber': '100',
      'addr:street': 'Main St',
      'addr:city': 'Boulder',
      phone: '+1 303-555-0100',
      website: 'https://alphacycles.example',
      opening_hours: 'Mo-Fr 10:00-18:00; Sa 10:00-16:00',
    },
    ...overrides,
  }
}

describe('haversineMiles', () => {
  it('computes a known distance', () => {
    // ~1 degree of latitude ≈ 69.1 miles
    expect(haversineMiles(ORIGIN, { lat: 41.0, lon: -105.0 })).toBeCloseTo(69.1, 0)
  })
})

describe('mapOverpassShops', () => {
  it('maps tags into shop fields', () => {
    const [shop] = mapOverpassShops([el()], ORIGIN)
    expect(shop.name).toBe('Alpha Cycles')
    expect(shop.address).toBe('100 Main St, Boulder')
    expect(shop.phone).toBe('+1 303-555-0100')
    expect(shop.hours).toContain('Mo-Fr')
    expect(shop.distanceMiles).toBeGreaterThan(0)
  })

  it('sorts by distance and caps the list', () => {
    const elements = Array.from({ length: 12 }, (_, i) =>
      el({ id: i, lat: 40.0 + (12 - i) * 0.01 }),
    )
    const shops = mapOverpassShops(elements, ORIGIN)
    expect(shops).toHaveLength(8)
    for (let i = 1; i < shops.length; i++) {
      expect(shops[i].distanceMiles).toBeGreaterThanOrEqual(shops[i - 1].distanceMiles)
    }
  })

  it('uses way centers, contact:* fallbacks, and defaults', () => {
    const way = el({
      type: 'way',
      lat: undefined,
      lon: undefined,
      center: { lat: 40.02, lon: -105.0 },
      tags: { 'contact:phone': '555', 'contact:website': 'https://w.example' },
    })
    const [shop] = mapOverpassShops([way], ORIGIN)
    expect(shop.name).toBe('Bike shop')
    expect(shop.phone).toBe('555')
    expect(shop.website).toBe('https://w.example')
    expect(shop.hours).toBeNull()
    expect(shop.address).toBe('')
  })

  it('drops elements without coordinates or tags', () => {
    expect(mapOverpassShops([{ type: 'node', id: 9 }], ORIGIN)).toHaveLength(0)
  })
})

describe('fetchNearbyShops', () => {
  it('queries Overpass for bicycle shops around the origin', async () => {
    let sentBody = ''
    const fetcher = (async (_url: unknown, init?: RequestInit) => {
      sentBody = String(init?.body)
      return new Response(JSON.stringify({ elements: [el()] }), { status: 200 })
    }) as typeof fetch
    const shops = await fetchNearbyShops(ORIGIN, fetcher)
    expect(shops).toHaveLength(1)
    expect(decodeURIComponent(sentBody)).toContain('"shop"="bicycle"')
    expect(sentBody).toContain('40')
  })

  it('falls through rate-limited mirrors to a working one', async () => {
    const tried: string[] = []
    const fetcher = (async (url: unknown) => {
      tried.push(String(url))
      if (tried.length === 1) return new Response('', { status: 406 })
      if (tried.length === 2) throw new TypeError('network error')
      return new Response(JSON.stringify({ elements: [el()] }), { status: 200 })
    }) as typeof fetch
    const shops = await fetchNearbyShops(ORIGIN, fetcher)
    expect(shops).toHaveLength(1)
    expect(tried).toHaveLength(3)
    expect(new Set(tried).size).toBe(3) // three distinct mirrors
  })

  it('friendly error only after every mirror fails', async () => {
    let calls = 0
    const fetcher = (async () => {
      calls++
      return new Response('', { status: 504 })
    }) as typeof fetch
    await expect(fetchNearbyShops(ORIGIN, fetcher)).rejects.toThrow(/busy/)
    expect(calls).toBe(3)
  })
})

describe('geocode', () => {
  it('returns coords for the top result', async () => {
    const fetcher = (async () =>
      new Response(JSON.stringify([{ lat: '40.1', lon: '-105.2' }]), { status: 200 })) as typeof fetch
    expect(await geocode('boulder co', fetcher)).toEqual({ lat: 40.1, lon: -105.2 })
  })

  it('friendly error for no matches', async () => {
    const fetcher = (async () => new Response('[]', { status: 200 })) as typeof fetch
    await expect(geocode('zzzz', fetcher)).rejects.toThrow(/Couldn't find/)
  })
})
