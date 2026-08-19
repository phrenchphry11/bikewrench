import { describe, expect, it } from 'vitest'
import { parseActivitiesCsv, shiftRidesToToday, ActivitiesParseError } from './parseActivities'

const HEADER = 'Activity Date,Activity Type,Distance,Moving Time,Activity Gear'

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join('\n')
}

describe('parseActivitiesCsv', () => {
  it('rejects an empty file with a friendly message', () => {
    expect(() => parseActivitiesCsv('')).toThrow(ActivitiesParseError)
    expect(() => parseActivitiesCsv('')).toThrow(/empty file/)
  })

  it('rejects a non-Strava CSV naming the missing column', () => {
    expect(() => parseActivitiesCsv('name,age\nalice,30')).toThrow(/Activity Date/)
  })

  it('rejects a file with activities but no rides (e.g. all yoga)', () => {
    const yogaOnly = csv(
      '"Jan 5, 2025, 8:00:00 AM",Yoga,0.0,3600,',
      '"Jan 6, 2025, 8:00:00 AM",Yoga,0.0,2700,',
      '"Jan 8, 2025, 7:00:00 AM",Workout,0.0,1800,',
      '"Jan 9, 2025, 6:30:00 AM",Run,5.2,1800,',
    )
    expect(() => parseActivitiesCsv(yogaOnly)).toThrow(ActivitiesParseError)
    expect(() => parseActivitiesCsv(yogaOnly)).toThrow(/no rides found/i)
  })

  it('keeps rides, drops non-rides, converts km to miles and seconds to hours', () => {
    const { rides, totalActivities } = parseActivitiesCsv(
      csv(
        '"Jan 5, 2025, 8:15:03 AM",Ride,100.0,7200,Bike A',
        '"Jan 6, 2025, 9:00:00 AM",Yoga,0.0,3600,',
        '"Jan 7, 2025, 9:00:00 AM",Gravel Ride,50.0,5400,Bike A',
      ),
    )
    expect(totalActivities).toBe(3)
    expect(rides).toHaveLength(2)
    expect(rides[0].miles).toBeCloseTo(62.14, 2)
    expect(rides[0].hours).toBeCloseTo(2)
    expect(rides[1].miles).toBeCloseTo(31.07, 2)
  })

  it('formats dates from local time without a UTC shift', () => {
    const { rides } = parseActivitiesCsv(csv('"Jan 5, 2025, 8:15:03 AM",Ride,10.0,3600,'))
    // A morning ride must stay on its own calendar day in every timezone.
    expect(rides[0].date).toBe('2025-01-05')
  })

  it('silently drops rows with unparseable numbers or dates', () => {
    const { rides } = parseActivitiesCsv(
      csv('not-a-date,Ride,10.0,3600,', '"Jan 5, 2025, 8:00:00 AM",Ride,abc,3600,', '"Jan 6, 2025, 8:00:00 AM",Ride,10.0,3600,'),
    )
    expect(rides).toHaveLength(1)
    expect(rides[0].date).toBe('2025-01-06')
  })
})

describe('shiftRidesToToday', () => {
  it('shifts all rides so the newest is today, preserving spacing', () => {
    const parsed = parseActivitiesCsv(
      csv('"Jan 1, 2020, 8:00:00 AM",Ride,10.0,3600,', '"Jan 11, 2020, 8:00:00 AM",Ride,10.0,3600,'),
    )
    const shifted = shiftRidesToToday(parsed)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newest = new Date(`${shifted.rides[1].date}T00:00:00`)
    const oldest = new Date(`${shifted.rides[0].date}T00:00:00`)
    expect(newest.getTime()).toBe(today.getTime())
    expect((newest.getTime() - oldest.getTime()) / 86_400_000).toBe(10)
  })

  it('leaves future-dated data untouched', () => {
    const parsed = parseActivitiesCsv(csv('"Jan 1, 2999, 8:00:00 AM",Ride,10.0,3600,'))
    expect(shiftRidesToToday(parsed)).toEqual(parsed)
  })
})
