import { describe, expect, it } from 'vitest'
import { fetchAllActivities, mapActivities, type StravaActivity } from './strava'
import { ActivitiesParseError } from './parseActivities'

function act(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    distance: 40233.6, // 25 miles in meters
    moving_time: 7200,
    start_date_local: '2026-08-01T08:15:00Z',
    sport_type: 'Ride',
    gear_id: 'b12345',
    ...overrides,
  }
}

describe('mapActivities', () => {
  it('converts meters to miles and seconds to hours', () => {
    const { rides } = mapActivities([act()])
    expect(rides[0].miles).toBeCloseTo(25, 1)
    expect(rides[0].hours).toBeCloseTo(2)
    expect(rides[0].date).toBe('2026-08-01')
    expect(rides[0].gear).toBe('b12345')
  })

  it('keeps all cycling sport types, drops the rest', () => {
    const { rides, totalActivities } = mapActivities([
      act({ sport_type: 'Ride' }),
      act({ sport_type: 'GravelRide' }),
      act({ sport_type: 'MountainBikeRide' }),
      act({ sport_type: 'EBikeRide' }),
      act({ sport_type: 'VirtualRide' }), // excluded, consistent with CSV path
      act({ sport_type: 'Run' }),
      act({ sport_type: 'Yoga' }),
    ])
    expect(rides).toHaveLength(4)
    expect(totalActivities).toBe(7)
  })

  it('throws the friendly error when nothing is a ride', () => {
    expect(() => mapActivities([act({ sport_type: 'Run' })])).toThrow(ActivitiesParseError)
    expect(() => mapActivities([act({ sport_type: 'Run' })])).toThrow(/no rides found/i)
  })

  it('uses local date, no timezone math', () => {
    // start_date_local is already athlete-local; slicing must not shift days.
    const { rides } = mapActivities([act({ start_date_local: '2026-01-05T07:00:00Z' })])
    expect(rides[0].date).toBe('2026-01-05')
  })

  it('handles null gear_id', () => {
    const { rides } = mapActivities([act({ gear_id: null })])
    expect(rides[0].gear).toBe('')
  })
})

describe('fetchAllActivities', () => {
  const mkFetcher = (pages: StravaActivity[][], status = 200) => {
    const calls: string[] = []
    const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(String(url))
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
      if (status !== 200) return new Response('', { status })
      const page = Number(new URL(String(url)).searchParams.get('page'))
      return new Response(JSON.stringify(pages[page - 1] ?? []), { status: 200 })
    }) as typeof fetch
    return { fetcher, calls }
  }

  it('pages until a short page arrives', async () => {
    const fullPage = Array.from({ length: 200 }, () => act())
    const { fetcher, calls } = mkFetcher([fullPage, fullPage, [act()]])
    const all = await fetchAllActivities('tok', fetcher)
    expect(all).toHaveLength(401)
    expect(calls).toHaveLength(3)
    expect(calls[2]).toContain('page=3')
  })

  it('single short page needs one request', async () => {
    const { fetcher, calls } = mkFetcher([[act(), act()]])
    const all = await fetchAllActivities('tok', fetcher)
    expect(all).toHaveLength(2)
    expect(calls).toHaveLength(1)
  })

  it('maps 429 to a rate-limit message', async () => {
    const { fetcher } = mkFetcher([], 429)
    await expect(fetchAllActivities('tok', fetcher)).rejects.toThrow(/rate-limiting/)
  })

  it('maps 401 to a reconnect message', async () => {
    const { fetcher } = mkFetcher([], 401)
    await expect(fetchAllActivities('tok', fetcher)).rejects.toThrow(/reconnect/)
  })
})
