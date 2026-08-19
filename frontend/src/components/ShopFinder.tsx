import { useState } from 'react'
import {
  fetchNearbyShops,
  geocode,
  getLocation,
  type BikeShop,
  type Coords,
} from '../lib/shops'

interface Props {
  selected: BikeShop | null
  onSelect: (shop: BikeShop | null) => void
}

type State =
  | { name: 'idle' }
  | { name: 'busy' }
  | { name: 'results'; shops: BikeShop[] }
  | { name: 'error'; message: string; offerManual: boolean }

export default function ShopFinder({ selected, onSelect }: Props) {
  const [state, setState] = useState<State>({ name: 'idle' })
  const [manualQuery, setManualQuery] = useState('')

  const search = async (coordsPromise: Promise<Coords>, offerManualOnError: boolean) => {
    setState({ name: 'busy' })
    try {
      const coords = await coordsPromise
      const shops = await fetchNearbyShops(coords)
      if (shops.length === 0) {
        setState({
          name: 'error',
          message: 'No bike shops found within ~6 miles — try a nearby town.',
          offerManual: true,
        })
        return
      }
      setState({ name: 'results', shops })
    } catch (e) {
      setState({
        name: 'error',
        message: e instanceof Error ? e.message : 'Shop lookup failed.',
        offerManual: offerManualOnError,
      })
    }
  }

  return (
    <section className="shop-finder no-print">
      <h3>Find a shop for this work</h3>

      {state.name === 'idle' && (
        <button type="button" onClick={() => void search(getLocation(), true)}>
          Find bike shops near me
        </button>
      )}

      {state.name === 'busy' && (
        <div className="busy">
          <span className="spinner" aria-hidden="true" />
          <p className="muted">Looking for shops nearby…</p>
        </div>
      )}

      {state.name === 'error' && (
        <>
          <p className="muted">{state.message}</p>
          {state.offerManual && (
            <form
              className="manual-loc"
              onSubmit={(e) => {
                e.preventDefault()
                if (manualQuery.trim()) void search(geocode(manualQuery.trim()), false)
              }}
            >
              <input
                type="text"
                placeholder="Town or zip code"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          )}
        </>
      )}

      {state.name === 'results' && (
        <ul className="shop-list">
          {state.shops.map((shop) => (
            <li key={shop.id} className={selected?.id === shop.id ? 'shop selected' : 'shop'}>
              <div className="shop-main">
                <strong>{shop.name}</strong>
                <span className="muted"> · {shop.distanceMiles.toFixed(1)} mi</span>
                {shop.address && <p className="muted">{shop.address}</p>}
                {shop.hours && <p className="muted shop-hours">{shop.hours}</p>}
                <p className="shop-links">
                  {shop.phone && <a href={`tel:${shop.phone}`}>{shop.phone}</a>}
                  {shop.website && (
                    <a href={shop.website} target="_blank" rel="noreferrer">
                      website
                    </a>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(selected?.id === shop.id ? null : shop)}
              >
                {selected?.id === shop.id ? 'Deselect' : 'Use this shop'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        Shop data from OpenStreetMap. Your location is sent only to OpenStreetMap services to run
        the search — never stored.
      </p>
    </section>
  )
}
