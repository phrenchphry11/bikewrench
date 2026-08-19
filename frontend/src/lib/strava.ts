import { ActivitiesParseError, type ParseResult } from './parseActivities'

export interface StravaConfig {
  configured: boolean
  client_id: string | null
}

export interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number // unix seconds
  athlete_name?: string | null
}

/** Subset of Strava's SummaryActivity we consume. */
export interface StravaActivity {
  distance: number // meters
  moving_time: number // seconds
  start_date_local: string // ISO datetime in the athlete's local time
  sport_type: string
  gear_id: string | null
}

// Strava API sport_type values (no spaces, unlike the CSV export's labels).
// VirtualRide excluded, consistent with the CSV path.
const RIDE_SPORT_TYPES = new Set([
  'Ride',
  'GravelRide',
  'MountainBikeRide',
  'EBikeRide',
  'EMountainBikeRide',
])

const METERS_TO_MILES = 0.000621371
const PER_PAGE = 200
const MAX_PAGES = 50 // 10,000 activities — sanity bound, not a real limit

const STORAGE_KEY = 'bikewrench_strava_tokens'

export async function getStravaConfig(): Promise<StravaConfig> {
  const res = await fetch('/api/strava/config')
  if (!res.ok) return { configured: false, client_id: null }
  return res.json()
}

export function authorizeUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export function saveTokens(tokens: StravaTokens): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function loadTokens(): StravaTokens | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StravaTokens
  } catch {
    return null
  }
}

export function clearTokens(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

async function tokenEndpoint(path: string, body: object): Promise<StravaTokens> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof data.detail === 'string' ? data.detail : 'Connecting to Strava failed — try again.',
    )
  }
  return data as StravaTokens
}

export function exchangeCode(code: string): Promise<StravaTokens> {
  return tokenEndpoint('/api/strava/token', { code })
}

export function refreshTokens(refresh_token: string): Promise<StravaTokens> {
  return tokenEndpoint('/api/strava/refresh', { refresh_token })
}

/** Valid tokens, refreshing through our backend if they expire within 5 min. */
export async function freshTokens(tokens: StravaTokens): Promise<StravaTokens> {
  if (tokens.expires_at * 1000 - Date.now() > 5 * 60 * 1000) return tokens
  const renewed = await refreshTokens(tokens.refresh_token)
  saveTokens(renewed)
  return renewed
}

export function mapActivities(
  activities: StravaActivity[],
  gearNames: Record<string, string> = {},
): ParseResult {
  const rides = activities
    .filter((a) => RIDE_SPORT_TYPES.has(a.sport_type))
    .filter((a) => Number.isFinite(a.distance) && Number.isFinite(a.moving_time))
    .map((a) => ({
      date: a.start_date_local.slice(0, 10),
      miles: a.distance * METERS_TO_MILES,
      hours: a.moving_time / 3600,
      gear: a.gear_id ? (gearNames[a.gear_id] ?? a.gear_id) : '',
    }))
  if (rides.length === 0) {
    throw new ActivitiesParseError(
      'No rides found in your Strava history — only non-cycling activities came back.',
    )
  }
  return { rides, totalActivities: activities.length }
}

type Fetcher = typeof fetch

/** gear_id -> human bike name, from the athlete profile. Best-effort: on any
 * failure the raw gear ids still work as (ugly but stable) group keys. */
export async function fetchGearNames(
  accessToken: string,
  fetcher: Fetcher = fetch,
): Promise<Record<string, string>> {
  try {
    const res = await fetcher('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return {}
    const body = (await res.json()) as { bikes?: { id: string; name: string }[] }
    return Object.fromEntries((body.bikes ?? []).map((b) => [b.id, b.name]))
  } catch {
    return {}
  }
}

export async function fetchAllActivities(
  accessToken: string,
  fetcher: Fetcher = fetch,
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetcher(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${PER_PAGE}&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (res.status === 429) {
      throw new Error(
        'Strava is rate-limiting requests right now — wait a few minutes and try again.',
      )
    }
    if (res.status === 401) {
      throw new Error('Strava session expired — please reconnect.')
    }
    if (!res.ok) {
      throw new Error(`Fetching your Strava activities failed (${res.status}).`)
    }
    const batch = (await res.json()) as StravaActivity[]
    all.push(...batch)
    if (batch.length < PER_PAGE) break
  }
  return all
}
