import { clearTokens, loadTokens } from '../lib/strava'
import poweredBy from '../assets/api_logo_pwrdBy_strava_horiz_light.png'

interface Props {
  onDisconnected: () => void
}

/** Required attribution when displaying Strava data, plus disconnect. */
export default function StravaBadge({ onDisconnected }: Props) {
  const tokens = loadTokens()

  const disconnect = async () => {
    if (tokens) {
      try {
        await fetch('https://www.strava.com/oauth/deauthorize', {
          method: 'POST',
          body: new URLSearchParams({ access_token: tokens.access_token }),
        })
      } catch {
        // Best effort — local disconnect below always happens; the grant can
        // also be revoked from Strava's own settings page.
      }
    }
    clearTokens()
    onDisconnected()
  }

  return (
    <div className="strava-badge no-print">
      <img src={poweredBy} alt="Powered by Strava" height={24} />
      {tokens && (
        <button type="button" className="linklike" onClick={() => void disconnect()}>
          Disconnect{tokens.athlete_name ? ` (${tokens.athlete_name})` : ''}
        </button>
      )}
    </div>
  )
}
