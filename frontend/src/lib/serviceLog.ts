/** Client-side service log: which components were replaced/serviced, when.
 * Lives in localStorage (no accounts, no server storage), keyed per bike so
 * multi-bike riders keep separate histories. */

export interface ServiceEntry {
  date: string // ISO yyyy-mm-dd
}

export type ServiceLog = Record<string, ServiceEntry>

const PREFIX = 'bikewrench_service_log:'

/** Stable storage key: the bike label when known, else a shared default. */
export function logKey(bikeLabel: string | null): string {
  return `${PREFIX}${bikeLabel?.trim() || 'default'}`
}

export function loadServiceLog(bikeLabel: string | null): ServiceLog {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(logKey(bikeLabel))
    return raw ? (JSON.parse(raw) as ServiceLog) : {}
  } catch {
    return {}
  }
}

export function recordService(
  bikeLabel: string | null,
  componentKey: string,
  date: string,
): ServiceLog {
  const log = loadServiceLog(bikeLabel)
  const next = { ...log, [componentKey]: { date } }
  try {
    localStorage.setItem(logKey(bikeLabel), JSON.stringify(next))
  } catch {
    /* storage full/blocked — the in-memory log still applies this session */
  }
  return next
}

export function clearService(bikeLabel: string | null, componentKey: string): ServiceLog {
  const log = loadServiceLog(bikeLabel)
  const next = { ...log }
  delete next[componentKey]
  try {
    localStorage.setItem(logKey(bikeLabel), JSON.stringify(next))
  } catch {
    /* best effort */
  }
  return next
}
