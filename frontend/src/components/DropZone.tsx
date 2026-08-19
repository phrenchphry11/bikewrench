import { useCallback, useRef, useState } from 'react'
import { parseActivitiesCsv, ActivitiesParseError, type ParseResult } from '../lib/parseActivities'
import sampleCsv from '../sample/activities.csv?raw'

interface Props {
  onParsed: (result: ParseResult) => void
}

export default function DropZone({ onParsed }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      try {
        const text = await file.text()
        onParsed(parseActivitiesCsv(text))
      } catch (e) {
        if (e instanceof ActivitiesParseError) setError(e.message)
        else setError('Could not read that file. Try re-exporting your Strava archive.')
      }
    },
    [onParsed],
  )

  return (
    <div>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
      >
        <p>
          <strong>Drop your Strava activities.csv here</strong>
        </p>
        <p>or tap to choose a file</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="sample-row">
        <span className="muted">No Strava account handy?</span>
        <button
          type="button"
          onClick={() => {
            try {
              onParsed(parseActivitiesCsv(sampleCsv))
            } catch {
              setError('The bundled sample data failed to load — please report this.')
            }
          }}
        >
          Try with sample data
        </button>
      </div>
      <details className="how-to">
        <summary>How do I get my activities.csv?</summary>
        <p>
          On strava.com: Settings → My Account → Download or Delete Your Account → "Download
          Request". Strava emails you an archive; <code>activities.csv</code> is inside it.
        </p>
      </details>
    </div>
  )
}
