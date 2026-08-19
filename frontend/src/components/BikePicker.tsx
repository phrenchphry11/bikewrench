import { groupByGear, UNASSIGNED } from '../lib/bikes'
import type { RideSummary } from '../lib/parseActivities'

interface Props {
  rides: RideSummary[]
  onPick: (gear: string | null, label: string | null) => void
}

export default function BikePicker({ rides, onPick }: Props) {
  const groups = groupByGear(rides)
  const totalMiles = rides.reduce((s, r) => s + r.miles, 0)

  return (
    <section className="bike-picker">
      <h2>Which bike is this report for?</h2>
      <p className="muted">Your history covers more than one bike — wear is per-bike.</p>
      <ul className="bike-list">
        {groups.map((g) => (
          <li key={g.gear}>
            <button
              type="button"
              className="bike-option"
              onClick={() =>
                onPick(g.gear, g.gear === UNASSIGNED ? null : g.gear)
              }
            >
              <strong>{g.gear === UNASSIGNED ? 'Rides with no bike assigned' : g.gear}</strong>
              <span className="muted">
                {g.rideCount.toLocaleString()} {g.rideCount === 1 ? 'ride' : 'rides'} ·{' '}
                {Math.round(g.miles).toLocaleString()} mi
              </span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="bike-option" onClick={() => onPick(null, null)}>
            <strong>All rides together</strong>
            <span className="muted">
              {rides.length.toLocaleString()} rides · {Math.round(totalMiles).toLocaleString()} mi
            </span>
          </button>
        </li>
      </ul>
    </section>
  )
}
