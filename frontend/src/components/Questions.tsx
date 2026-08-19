import { useState } from 'react'
import type { Answers, Baselines, BikeType, Conditions } from '../lib/api'

interface Props {
  onSubmit: (answers: Answers) => void
}

const BIKE_TYPES: { value: BikeType; label: string }[] = [
  { value: 'road', label: 'Road' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'mtb', label: 'Mountain' },
]

const CONDITION_OPTIONS: { value: Conditions; label: string }[] = [
  { value: 'dry', label: 'Mostly dry' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'wet', label: 'Often wet' },
]

interface ReplacedState {
  miles: string
  date: string
}

function baselineFrom(key: 'chain' | 'tires', s: ReplacedState): Baselines {
  const miles = parseFloat(s.miles)
  if (!isNaN(miles) && miles >= 0) return { [`${key}_miles_ago`]: miles }
  if (s.date) return { [`${key}_date`]: s.date }
  return {}
}

function ReplacedFields({
  legend,
  state,
  onChange,
}: {
  legend: string
  state: ReplacedState
  onChange: (s: ReplacedState) => void
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="replaced-row">
        <label>
          Miles ago
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="not sure"
            value={state.miles}
            onChange={(e) => onChange({ miles: e.target.value, date: '' })}
          />
        </label>
        <span className="or">or</span>
        <label>
          Date
          <input
            type="date"
            value={state.date}
            onChange={(e) => onChange({ miles: '', date: e.target.value })}
          />
        </label>
      </div>
      <p className="hint">Leave blank if you're not sure — we'll assume conservatively.</p>
    </fieldset>
  )
}

export default function Questions({ onSubmit }: Props) {
  const [bikeType, setBikeType] = useState<BikeType>('road')
  const [conditions, setConditions] = useState<Conditions>('mixed')
  const [chain, setChain] = useState<ReplacedState>({ miles: '', date: '' })
  const [tires, setTires] = useState<ReplacedState>({ miles: '', date: '' })
  const [bikeDate, setBikeDate] = useState('')

  return (
    <form
      className="questions"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          bikeType,
          conditions,
          baselines: {
            ...baselineFrom('chain', chain),
            ...baselineFrom('tires', tires),
            ...(bikeDate ? { bike_date: bikeDate } : {}),
          },
        })
      }}
    >
      <fieldset>
        <legend>What kind of bike?</legend>
        <div className="segmented">
          {BIKE_TYPES.map((o) => (
            <label key={o.value} className={bikeType === o.value ? 'selected' : ''}>
              <input
                type="radio"
                name="bikeType"
                value={o.value}
                checked={bikeType === o.value}
                onChange={() => setBikeType(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Riding conditions?</legend>
        <div className="segmented">
          {CONDITION_OPTIONS.map((o) => (
            <label key={o.value} className={conditions === o.value ? 'selected' : ''}>
              <input
                type="radio"
                name="conditions"
                value={o.value}
                checked={conditions === o.value}
                onChange={() => setConditions(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <ReplacedFields legend="Chain last replaced?" state={chain} onChange={setChain} />
      <ReplacedFields legend="Tires last replaced?" state={tires} onChange={setTires} />

      <fieldset>
        <legend>Had this bike since… (optional)</legend>
        <div className="replaced-row">
          <label>
            Date
            <input type="date" value={bikeDate} onChange={(e) => setBikeDate(e.target.value)} />
          </label>
        </div>
        <p className="hint">
          If your Strava history is older than this bike, rides before this date are ignored.
        </p>
      </fieldset>

      <button type="submit" className="primary">
        Get my Bike Health Report
      </button>
    </form>
  )
}
