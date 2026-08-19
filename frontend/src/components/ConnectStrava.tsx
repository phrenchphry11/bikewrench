import { useEffect, useState } from 'react'
import { authorizeUrl, getStravaConfig } from '../lib/strava'
import connectButton from '../assets/btn_strava_connect_with_orange.svg'

export default function ConnectStrava() {
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    void getStravaConfig().then((cfg) => {
      if (cfg.configured && cfg.client_id) setClientId(cfg.client_id)
    })
  }, [])

  // Deployments without Strava credentials simply don't show the button.
  if (!clientId) return null

  return (
    <div className="strava-row">
      <button
        type="button"
        className="strava-connect"
        aria-label="Connect with Strava"
        onClick={() => {
          window.location.href = authorizeUrl(clientId)
        }}
      >
        {/* Official Strava asset — brand guidelines require it unmodified */}
        <img src={connectButton} alt="Connect with Strava" height={48} />
      </button>
      <span className="muted">— or use a CSV export below</span>
    </div>
  )
}
