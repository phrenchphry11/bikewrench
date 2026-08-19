import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearService, loadServiceLog, logKey, recordService } from './serviceLog'

describe('serviceLog', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    ;(globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
  })

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).localStorage
  })

  it('starts empty and round-trips an entry', () => {
    expect(loadServiceLog('Marin Gestalt')).toEqual({})
    recordService('Marin Gestalt', 'chain', '2026-08-18')
    expect(loadServiceLog('Marin Gestalt')).toEqual({ chain: { date: '2026-08-18' } })
  })

  it('keys per bike; null label pools under default', () => {
    recordService('Marin Gestalt', 'chain', '2026-08-18')
    recordService(null, 'chain', '2026-01-01')
    expect(loadServiceLog('Marin Gestalt').chain.date).toBe('2026-08-18')
    expect(loadServiceLog(null).chain.date).toBe('2026-01-01')
    expect(logKey(null)).toContain('default')
  })

  it('clearService removes one component only', () => {
    recordService(null, 'chain', '2026-08-18')
    recordService(null, 'cassette', '2026-08-18')
    clearService(null, 'chain')
    expect(loadServiceLog(null)).toEqual({ cassette: { date: '2026-08-18' } })
  })

  it('survives corrupt storage', () => {
    store.set(logKey(null), '{not json')
    expect(loadServiceLog(null)).toEqual({})
  })
})
