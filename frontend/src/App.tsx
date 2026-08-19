import { useState } from 'react'
import DropZone from './components/DropZone'
import type { ParseResult } from './lib/parseActivities'
import './App.css'

function App() {
  const [parsed, setParsed] = useState<ParseResult | null>(null)

  const totalMiles = parsed ? parsed.rides.reduce((s, r) => s + r.miles, 0) : 0

  return (
    <main className="app">
      <h1>Bike Health Report</h1>
      <p className="tagline">A shop-ready service report in 60 seconds, from the ride data you already have.</p>

      {!parsed ? (
        <DropZone onParsed={setParsed} />
      ) : (
        <section>
          <p>
            Found <strong>{parsed.rides.length}</strong> rides ({parsed.totalActivities} activities
            total) — <strong>{Math.round(totalMiles).toLocaleString()}</strong> miles.
          </p>
          <p className="muted">Next up: bike questions &amp; your report (M3).</p>
          <button onClick={() => setParsed(null)}>Start over</button>
        </section>
      )}
    </main>
  )
}

export default App
