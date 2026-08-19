import Papa from 'papaparse'

export interface RideSummary {
  date: string // ISO yyyy-mm-dd
  miles: number
  hours: number
  gear: string
}

export interface ParseResult {
  rides: RideSummary[]
  totalActivities: number
}

export class ActivitiesParseError extends Error {}

// Strava export columns we care about; everything else (GPX blobs etc.) is ignored.
const DATE_COL = 'Activity Date'
const TYPE_COL = 'Activity Type'
const DISTANCE_COL = 'Distance' // kilometers in Strava exports
const MOVING_TIME_COL = 'Moving Time' // seconds
const GEAR_COL = 'Activity Gear'

const RIDE_TYPES = new Set(['Ride', 'Gravel Ride', 'Mountain Bike Ride', 'E-Bike Ride'])

const KM_TO_MILES = 0.621371

function toLocalIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function parseStravaDate(raw: string): string | null {
  // Strava format: "Jan 5, 2024, 8:15:03 AM" — local time with no offset, so
  // format with local components; toISOString() would shift the date for
  // viewers ahead of UTC.
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return toLocalIsoDate(d)
}

/** Shift all ride dates forward so the newest ride is today (spacing kept).
 * Keeps the bundled sample demo evergreen instead of aging into "overdue". */
export function shiftRidesToToday(result: ParseResult): ParseResult {
  const times = result.rides.map((r) => new Date(`${r.date}T00:00:00`).getTime())
  const newest = Math.max(...times)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const offsetDays = Math.round((today.getTime() - newest) / 86_400_000)
  if (offsetDays <= 0) return result
  const rides = result.rides.map((r) => {
    const d = new Date(`${r.date}T00:00:00`)
    d.setDate(d.getDate() + offsetDays)
    return { ...r, date: toLocalIsoDate(d) }
  })
  return { ...result, rides }
}

export function parseActivitiesCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.data.length === 0) {
    throw new ActivitiesParseError('No rows found — is this an empty file?')
  }

  const fields = parsed.meta.fields ?? []
  for (const col of [DATE_COL, TYPE_COL, DISTANCE_COL, MOVING_TIME_COL]) {
    if (!fields.includes(col)) {
      throw new ActivitiesParseError(
        `Missing column "${col}" — this doesn't look like a Strava activities.csv export.`,
      )
    }
  }

  const rides: RideSummary[] = []
  for (const row of parsed.data) {
    if (!RIDE_TYPES.has(row[TYPE_COL])) continue
    const date = parseStravaDate(row[DATE_COL])
    const km = parseFloat(row[DISTANCE_COL])
    const seconds = parseFloat(row[MOVING_TIME_COL])
    if (date === null || isNaN(km) || isNaN(seconds)) continue
    rides.push({
      date,
      miles: km * KM_TO_MILES,
      hours: seconds / 3600,
      gear: row[GEAR_COL] ?? '',
    })
  }

  if (rides.length === 0) {
    throw new ActivitiesParseError(
      'No rides found in this file. It parsed fine, but every activity is a non-cycling type.',
    )
  }

  return { rides, totalActivities: parsed.data.length }
}
