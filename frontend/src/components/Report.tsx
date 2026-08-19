import type { ComponentCard, Report as ReportData, Status } from '../lib/api'

interface Props {
  report: ReportData
  bikeLabel?: string | null
  onStartOver: () => void
  onWorkOrder: () => void
  onMarkServiced: (componentKey: string) => void
}

const STATUS_LABEL: Record<Status, string> = {
  green: 'Good',
  due_soon: 'Due soon',
  overdue: 'Overdue',
}

function scoreWord(score: number): string {
  if (score >= 80) return 'Great shape'
  if (score >= 60) return 'Good shape'
  if (score >= 40) return 'Needs attention'
  return 'Time for a shop visit'
}

function formatInterval(card: ComponentCard): string {
  const unit = card.unit === 'miles' ? 'mi' : 'mo'
  const lo = card.interval_lo.toLocaleString()
  const hi = card.interval_hi.toLocaleString()
  const range = card.interval_lo === card.interval_hi ? lo : `${lo}–${hi}`
  return `${Math.round(card.used).toLocaleString()} of ${range} ${unit}`
}

function Card({ card, onMarkServiced }: { card: ComponentCard; onMarkServiced: () => void }) {
  const pct = Math.min(card.pct_used, 1)
  return (
    <li className={`card ${card.status}`}>
      <div className="card-head">
        <h3>{card.label}</h3>
        <span className={`pill ${card.status}`}>{STATUS_LABEL[card.status]}</span>
      </div>
      <div className="wear-bar" role="presentation">
        <div className="wear-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="card-usage">
        {formatInterval(card)} · {Math.round(card.pct_used * 100)}% used
        {card.serviced_on && <span className="serviced"> · serviced {card.serviced_on}</span>}
      </p>
      <p className="card-why">{card.explanation}</p>
      {card.status !== 'green' && (
        <button type="button" className="linklike card-serviced-btn" onClick={onMarkServiced}>
          I replaced / serviced this
        </button>
      )}
    </li>
  )
}

export default function Report({
  report,
  bikeLabel,
  onStartOver,
  onWorkOrder,
  onMarkServiced,
}: Props) {
  const attention = report.cards.filter((c) => c.status !== 'green').length
  return (
    <section className="report">
      <header className="score-header">
        <div className="score-ring">
          <span className="score-number">{report.health_score}</span>
          <span className="score-max">/100</span>
        </div>
        <div>
          <h2>{scoreWord(report.health_score)}</h2>
          <p className="muted">
            {bikeLabel ? `${bikeLabel} · ` : ''}
            {report.ride_count.toLocaleString()} rides ·{' '}
            {Math.round(report.total_miles).toLocaleString()} miles ·{' '}
            {attention === 0 ? 'nothing needs attention' : `${attention} items need attention`}
          </p>
        </div>
      </header>

      <ul className="cards">
        {report.cards.map((card) => (
          <Card key={card.key} card={card} onMarkServiced={() => onMarkServiced(card.key)} />
        ))}
      </ul>

      <div className="report-actions">
        <button className="primary" onClick={onWorkOrder}>
          Get your Shop Work Order
        </button>
        <button onClick={onStartOver}>Start over</button>
      </div>
    </section>
  )
}
