import { useState } from 'react'
import DropZone from './components/DropZone'
import Questions from './components/Questions'
import Report from './components/Report'
import { fetchReport, type Answers, type Report as ReportData } from './lib/api'
import type { ParseResult } from './lib/parseActivities'
import './App.css'

type Step =
  | { name: 'upload' }
  | { name: 'questions'; parsed: ParseResult }
  | { name: 'loading'; parsed: ParseResult }
  | { name: 'report'; parsed: ParseResult; report: ReportData }
  | { name: 'error'; parsed: ParseResult; message: string }

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

  return (
    <main className="app">
      <h1>Bike Health Report</h1>
      <p className="tagline">A shop-ready service report in 60 seconds, from the ride data you already have.</p>

      {step.name === 'upload' && <DropZone onParsed={(parsed) => setStep({ name: 'questions', parsed })} />}

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
        <Report report={step.report} onStartOver={() => setStep({ name: 'upload' })} />
      )}

      {step.name === 'error' && (
        <>
          <p className="error">{step.message}</p>
          <button onClick={() => setStep({ name: 'questions', parsed: step.parsed })}>
            Back to questions
          </button>
        </>
      )}
    </main>
  )
}

export default App
