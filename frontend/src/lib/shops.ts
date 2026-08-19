/** Local bike shop lookup via OpenStreetMap — Overpass for shops, Nominatim
 * for the typed-address fallback. Free, keyless, called directly from the
 * browser; coordinates are sent to those OSM services and nowhere else. */

export interface Coords {
  lat: number
  lon: number
}

export interface BikeShop {
  id: string
  name: string
  distanceMiles: number
  address: string
  phone: string | null
  website: string | null
  hours: string | null
}

// Public Overpass instances, tried in order — the main one rate-limits
// anonymous use aggressively, so a single 4xx/network failure falls through
// to the next mirror instead of failing the search.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const RADIUS_METERS = 10_000 // ~6 miles
const MAX_SHOPS = 8

type Fetcher = typeof fetch

export function getLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not available in this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied — enter a town or zip instead.'
              : 'Could not get your location — enter a town or zip instead.',
          ),
        ),
      { timeout: 10_000, maximumAge: 300_000 },
    )
  })
}

export async function geocode(query: string, fetcher: Fetcher = fetch): Promise<Coords> {
  const params = new URLSearchParams({ q: query, format: 'json', limit: '1' })
  const res = await fetcher(`${NOMINATIM_URL}?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Location lookup failed — try again.')
  const results = (await res.json()) as { lat: string; lon: string }[]
  if (!results.length) throw new Error(`Couldn't find "${query}" — try a town name or zip code.`)
  return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) }
}

export function haversineMiles(a: Coords, b: Coords): number {
  const R = 3958.8
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function elementAddress(tags: Record<string, string>): string {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  return [street, tags['addr:city']].filter(Boolean).join(', ')
}

export function mapOverpassShops(elements: OverpassElement[], origin: Coords): BikeShop[] {
  return elements
    .map((el): BikeShop | null => {
      const coords = el.center ?? (el.lat !== undefined ? { lat: el.lat!, lon: el.lon! } : null)
      if (!coords || !el.tags) return null
      const tags = el.tags
      return {
        id: `${el.type}/${el.id}`,
        name: tags.name ?? 'Bike shop',
        distanceMiles: haversineMiles(origin, coords),
        address: elementAddress(tags),
        phone: tags.phone ?? tags['contact:phone'] ?? null,
        website: tags.website ?? tags['contact:website'] ?? null,
        hours: tags.opening_hours ?? null,
      }
    })
    .filter((s): s is BikeShop => s !== null)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, MAX_SHOPS)
}

export async function fetchNearbyShops(origin: Coords, fetcher: Fetcher = fetch): Promise<BikeShop[]> {
  const query = `[out:json][timeout:15];nwr["shop"="bicycle"](around:${RADIUS_METERS},${origin.lat},${origin.lon});out center tags;`
  for (const mirror of OVERPASS_MIRRORS) {
    let res: Response
    try {
      res = await fetcher(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
      })
    } catch {
      continue // network/CORS failure — try the next mirror
    }
    if (!res.ok) continue // rate-limited or unhappy mirror — try the next
    const body = (await res.json()) as { elements?: OverpassElement[] }
    return mapOverpassShops(body.elements ?? [], origin)
  }
  throw new Error('The shop lookup services are all busy — try again in a few minutes.')
}
