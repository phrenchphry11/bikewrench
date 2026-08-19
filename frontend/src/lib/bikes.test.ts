import { describe, expect, it } from 'vitest'
import { filterToBike, groupByGear, needsBikePicker, UNASSIGNED } from './bikes'
import type { RideSummary } from './parseActivities'

function ride(gear: string, miles = 10): RideSummary {
  return { date: '2026-08-01', miles, hours: 1, gear }
}

describe('groupByGear', () => {
  it('groups and sorts by total miles descending', () => {
    const groups = groupByGear([
      ride('Commuter', 5),
      ride('Road Bike', 100),
      ride('Commuter', 5),
      ride('Road Bike', 50),
    ])
    expect(groups.map((g) => g.gear)).toEqual(['Road Bike', 'Commuter'])
    expect(groups[0]).toEqual({ gear: 'Road Bike', rideCount: 2, miles: 150 })
  })

  it('pools blank gear under UNASSIGNED', () => {
    const groups = groupByGear([ride(''), ride('  '), ride('Road Bike')])
    const unassigned = groups.find((g) => g.gear === UNASSIGNED)
    expect(unassigned?.rideCount).toBe(2)
  })
})

describe('needsBikePicker', () => {
  it('false for zero or one named bike', () => {
    expect(needsBikePicker([ride(''), ride('')])).toBe(false)
    expect(needsBikePicker([ride('Road Bike'), ride('Road Bike'), ride('')])).toBe(false)
  })

  it('true for two named bikes', () => {
    expect(needsBikePicker([ride('Road Bike'), ride('Gravel Rig')])).toBe(true)
  })
})

describe('filterToBike', () => {
  const parsed = {
    rides: [ride('Road Bike', 100), ride('Gravel Rig', 50), ride('', 5)],
    totalActivities: 3,
  }

  it('keeps only the chosen bike', () => {
    const out = filterToBike(parsed, 'Road Bike')
    expect(out.rides).toHaveLength(1)
    expect(out.rides[0].miles).toBe(100)
  })

  it('null means all rides', () => {
    expect(filterToBike(parsed, null).rides).toHaveLength(3)
  })

  it('UNASSIGNED selects blank-gear rides', () => {
    const out = filterToBike(parsed, UNASSIGNED)
    expect(out.rides).toHaveLength(1)
    expect(out.rides[0].miles).toBe(5)
  })
})
