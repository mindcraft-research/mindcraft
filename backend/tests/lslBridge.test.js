// Pont WebSocket → relais LSL (frontend/src/lib/lslBridge.js) : reconnexion.
// Module pur du frontend, testé ici faute de suite de tests côté frontend
// (même principe que physioMarkers.test.js).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import LSLBridge, { RECONNEXION_MIN_MS, RECONNEXION_MAX_MS } from '../../frontend/src/lib/lslBridge.js'

// Faux WebSocket : chaque instance est gardée ; le test décide si elle
// s'ouvre (ouvrir) ou échoue (echouer : error puis close, comme un navigateur).
class FauxWS {
  static OPEN = 1
  static instances = []
  constructor(url) {
    this.url = url
    this.readyState = 0
    this.envoyes = []
    this.ferme = false
    FauxWS.instances.push(this)
  }
  send(d) { this.envoyes.push(JSON.parse(d).marker) }
  close() { this.ferme = true; this.readyState = 3; this.onclose?.() }
  ouvrir() { this.readyState = FauxWS.OPEN; this.onopen?.() }
  echouer() { this.readyState = 3; this.onerror?.(); this.onclose?.() }
}

beforeEach(() => {
  FauxWS.instances = []
  vi.useFakeTimers()
  vi.stubGlobal('WebSocket', FauxWS)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('LSLBridge : connexion et reconnexion', () => {
  it('relais présent dès le début : connexion, marqueurs envoyés tout de suite', async () => {
    const b = new LSLBridge()
    const p = b.connect(12345)
    expect(FauxWS.instances[0].url).toBe('ws://localhost:12345')
    FauxWS.instances[0].ouvrir()
    expect(await p).toBe(true)
    b.send('STUDY_START')
    expect(FauxWS.instances[0].envoyes).toEqual(['STUDY_START'])
  })

  it('premier essai refusé : nouvel essai, puis marqueurs gardés envoyés dans l\'ordre', async () => {
    const b = new LSLBridge()
    const p = b.connect(12345)
    b.send('STUDY_START')
    FauxWS.instances[0].echouer()
    expect(await p).toBe(false)               // même résultat qu'avant au premier échec
    b.send('BLOCK_START idx=1')
    expect(FauxWS.instances).toHaveLength(1)
    vi.advanceTimersByTime(RECONNEXION_MIN_MS)
    expect(FauxWS.instances).toHaveLength(2)  // nouvel essai
    FauxWS.instances[1].ouvrir()
    expect(FauxWS.instances[1].envoyes).toEqual(['STUDY_START', 'BLOCK_START idx=1'])
    expect(b.queue).toEqual([])
  })

  it('délai doublé à chaque échec, plafonné ; remis au minimum après une connexion', () => {
    const b = new LSLBridge()
    b.connect(12345)
    const attendus = [1000, 2000, 4000, 8000, 10000, 10000]
    for (const attendu of attendus) {
      FauxWS.instances.at(-1).echouer()
      const avant = FauxWS.instances.length
      vi.advanceTimersByTime(attendu - 1)
      expect(FauxWS.instances.length).toBe(avant)      // pas encore
      vi.advanceTimersByTime(1)
      expect(FauxWS.instances.length).toBe(avant + 1)  // essai au délai attendu
    }
    FauxWS.instances.at(-1).ouvrir()
    expect(b.delay).toBe(RECONNEXION_MIN_MS)
  })

  it('pas de nouvel essai avant le délai', () => {
    const b = new LSLBridge()
    b.connect(12345)
    FauxWS.instances[0].echouer()
    vi.advanceTimersByTime(RECONNEXION_MIN_MS - 1)
    expect(FauxWS.instances).toHaveLength(1)
  })

  it('connexion perdue en cours de passation : reconnexion, marqueurs gardés entre-temps', () => {
    const b = new LSLBridge()
    b.connect(12345)
    FauxWS.instances[0].ouvrir()
    b.send('A')
    FauxWS.instances[0].echouer()             // relais redémarré, par exemple
    b.send('B')
    vi.advanceTimersByTime(RECONNEXION_MIN_MS)
    FauxWS.instances[1].ouvrir()
    expect(FauxWS.instances[0].envoyes).toEqual(['A'])
    expect(FauxWS.instances[1].envoyes).toEqual(['B'])
  })

  it('disconnect : ferme la connexion et arrête les essais', () => {
    const b = new LSLBridge()
    b.connect(12345)
    FauxWS.instances[0].echouer()
    b.disconnect()
    vi.advanceTimersByTime(RECONNEXION_MAX_MS * 3)
    expect(FauxWS.instances).toHaveLength(1)

    const c = new LSLBridge()
    c.connect(12345)
    FauxWS.instances[1].ouvrir()
    c.disconnect()
    expect(FauxWS.instances[1].ferme).toBe(true)
    vi.advanceTimersByTime(RECONNEXION_MAX_MS * 3)
    expect(FauxWS.instances).toHaveLength(2)  // la fermeture voulue ne relance rien
  })

  it('un seul avertissement dans la console tant que le relais ne répond pas', () => {
    const b = new LSLBridge()
    b.connect(12345)
    for (let i = 0; i < 4; i++) {
      FauxWS.instances.at(-1).echouer()
      vi.advanceTimersByTime(RECONNEXION_MAX_MS)
    }
    expect(console.warn).toHaveBeenCalledTimes(1)
  })
})
