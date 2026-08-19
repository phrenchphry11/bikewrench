import type { ParseResult, RideSummary } from './parseActivities'

export const UNASSIGNED = '__unassigned__'

export interface BikeGroup {
  gear: string // gear name, or UNASSIGNED
  rideCount: number
  miles: number
}

/** Group rides by gear, most-ridden first; empty gear pools under UNASSIGNED. */
export function groupByGear(rides: RideSummary[]): BikeGroup[] {
  const groups = new Map<string, BikeGroup>()
  for (const ride of rides) {
    const gear = ride.gear.trim() || UNASSIGNED
    const group = groups.get(gear) ?? { gear, rideCount: 0, miles: 0 }
    group.rideCount++
    group.miles += ride.miles
    groups.set(gear, group)
  }
  return [...groups.values()].sort((a, b) => b.miles - a.miles)
}

/** True when the history spans more than one bike and a picker is worth showing. */
export function needsBikePicker(rides: RideSummary[]): boolean {
  const named = new Set(rides.map((r) => r.gear.trim()).filter(Boolean))
  return named.size > 1
}

/** Narrow a parse result to one bike's rides (or pass through for 'all'). */
export function filterToBike(parsed: ParseResult, gear: string | null): ParseResult {
  if (gear === null) return parsed
  const rides = parsed.rides.filter((r) => (r.gear.trim() || UNASSIGNED) === gear)
  return { ...parsed, rides }
}
