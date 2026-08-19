import type { RideSummary } from './parseActivities'

export type BikeType = 'road' | 'gravel' | 'mtb'
export type Conditions = 'dry' | 'mixed' | 'wet'
export type Status = 'green' | 'due_soon' | 'overdue'

export interface Baselines {
  chain_miles_ago?: number
  chain_date?: string
  tires_miles_ago?: number
  tires_date?: string
  bike_date?: string
}

export interface Answers {
  bikeType: BikeType
  conditions: Conditions
  baselines: Baselines
}

export interface ComponentCard {
  key: string
  label: string
  unit: 'miles' | 'months'
  used: number
  interval_lo: number
  interval_hi: number
  pct_used: number
  status: Status
  explanation: string
}

export interface Report {
  health_score: number
  bike_type: BikeType
  conditions: Conditions
  total_miles: number
  ride_count: number
  first_ride: string
  last_ride: string
  cards: ComponentCard[]
}

export async function fetchReport(rides: RideSummary[], answers: Answers): Promise<Report> {
  const res = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rides: rides.map(({ date, miles, hours }) => ({ date, miles, hours })),
      bike_type: answers.bikeType,
      conditions: answers.conditions,
      baselines: answers.baselines,
    }),
  })
  if (!res.ok) {
    let detail = `Report request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      /* keep generic message */
    }
    throw new Error(detail)
  }
  return res.json()
}
