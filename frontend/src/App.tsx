import { useEffect, useState } from 'react'
import ConnectStrava from './components/ConnectStrava'
import DropZone from './components/DropZone'
import Questions from './components/Questions'
import Report from './components/Report'
import WorkOrder from './components/WorkOrder'
import { fetchReport, type Answers, type Report as ReportData } from './lib/api'
import type { ParseResult } from './lib/parseActivities'
import {
  exchangeCode,
  fetchAllActivities,
  freshTokens,
  loadTokens,
  mapActivities,
  saveTokens,
} from './lib/strava'
import './App.css'

type Step =
  | { name: 'upload' }
  | { name: 'importing' } // pulling rides from Strava
  | { name: 'questions'; parsed: ParseResult }
  | { name: 'loading'; parsed: ParseResult }
  | { name: 'report'; parsed: ParseResult; report: ReportData }
  | { name: 'workorder'; parsed: ParseResult; report: ReportData }
  | { name: 'error'; parsed: ParseResult | null; message: string }

function App() {
  const [step, setStep] = useState<Step>({ name: 'upload' })

  const runReport = async (parsed: ParseResult, answers: Answers) => {
    setStep({ name: 'loading', parsed })
    try {
      const report = await fetchReport(parsed.rides, answers)
      setStep({ name: 'report', parsed, report })
    } catch (e) {
      setStep({
        name: 'error',
        parsed,
        message: e instanceof Error ? e.message : 'Something went wrong building your report.',
      })
    }
  }

  // Handle the OAuth round-trip: Strava redirects back with ?code= (or ?error=).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')
    if (!code && !oauthError) return
    window.history.replaceState(null, '', window.location.pathname)

    if (oauthError) {
      setStep({
        name: 'error',
        parsed: null,
        message:
          oauthError === 'access_denied'
            ? "No problem — you can still drop in a CSV export instead."
            : 'Connecting to Strava failed — try again, or use a CSV export.',
      })
      return
    }

    const importFromStrava = async () => {
      setStep({ name: 'importing' })
      try {
        const tokens = await exchangeCode(code!)
        saveTokens(tokens)
        const usable = await freshTokens(tokens)
        const activities = await fetchAllActivities(usable.access_token)
        setStep({ name: 'questions', parsed: mapActivities(activities) })
      } catch (e) {
        setStep({
          name: 'error',
          parsed: null,
          message: e instanceof Error ? e.message : 'Importing from Strava failed.',
        })
      }
    }
    void importFromStrava()
  }, [])

  // A tab that already connected this session can skip the redirect.
  useEffect(() => {
    if (step.name !== 'upload') return
    const tokens = loadTokens()
    if (!tokens) return
    const reimport = async () => {
      setStep({ name: 'importing' })
      try {
        const usable = await freshTokens(tokens)
        const activities = await fetchAllActivities(usable.access_token)
        setStep({ name: 'questions', parsed: mapActivities(activities) })
      } catch {
        setStep({ name: 'upload' }) // stale session — fall back silently
      }
    }
    void reimport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="app">
      <div className="no-print">
        <h1>Bike Health Report</h1>
        <p className="tagline">A shop-ready service report in 60 seconds, from the ride data you already have.</p>
      </div>

      {step.name === 'upload' && (
        <>
          <ConnectStrava />
          <DropZone onParsed={(parsed) => setStep({ name: 'questions', parsed })} />
        </>
      )}

      {step.name === 'importing' && <p className="muted">Pulling your rides from Strava…</p>}

      {step.name === 'questions' && (
        <>
          <p className="muted">
            Found {step.parsed.rides.length.toLocaleString()} rides — three quick questions:
          </p>
          <Questions onSubmit={(answers) => void runReport(step.parsed, answers)} />
        </>
      )}

      {step.name === 'loading' && <p className="muted">Checking your components…</p>}

      {step.name === 'report' && (
        <Report
          report={step.report}
          onStartOver={() => setStep({ name: 'upload' })}
          onWorkOrder={() => setStep({ ...step, name: 'workorder' })}
        />
      )}

      {step.name === 'workorder' && (
        <WorkOrder
          report={step.report}
          onBack={() => setStep({ ...step, name: 'report' })}
        />
      )}

      {step.name === 'error' && (
        <>
          <p className="error">{step.message}</p>
          {step.parsed ? (
            <button onClick={() => setStep({ name: 'questions', parsed: step.parsed! })}>
              Back to questions
            </button>
          ) : (
            <button onClick={() => setStep({ name: 'upload' })}>Back to start</button>
          )}
        </>
      )}
    </main>
  )
}

export default App
