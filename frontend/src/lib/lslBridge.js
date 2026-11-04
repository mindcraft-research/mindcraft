/**
 * LSL Bridge — Pont WebSocket → Lab Streaming Layer
 *
 * Se connecte à un serveur relay local (Python/Node) qui retransmet
 * les marqueurs vers un flux LSL pour synchronisation avec EEG/ECG/Eyetracking.
 *
 * Dégradation gracieuse : si la connexion échoue, la passation continue ;
 * les marqueurs sont gardés et envoyés dès que le relais répond.
 */

/**
 * Compose un marqueur LSL « auto-porteur » : le nom, suivi des données de
 * l'essai sous forme `clé=valeur`, séparées par des espaces.
 *
 *   formatMarker('EMAIL_ONSET', { trial: 3, code: 'P01_Banque', type: 'phishing' })
 *   → 'EMAIL_ONSET trial=3 code=P01_Banque type=phishing'
 *
 * Pourquoi : le flux LSL ne transporte qu'une chaîne par marqueur. Sans ces
 * données, tous les `FIXATION` d'une passation sont identiques et rien ne
 * permet, à l'analyse, de rattacher un marqueur à un essai ou à un stimulus.
 * Le relais (docs/lsl-relay.py) transmet la chaîne telle quelle : ancien et
 * nouveau format cohabitent sans changement côté relais.
 */
export function formatMarker(name, data) {
  const parts = [String(name ?? '').trim()]
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null || typeof v === 'object') continue
      // Ni espace ni signe égal dans les valeurs : le format reste découpable.
      parts.push(`${k}=${String(v).replace(/[\s=]+/g, '_')}`)
    }
  }
  return parts.join(' ')
}

/**
 * Reconnexion : une seule tentative ne suffit pas. Le relais peut démarrer
 * après la page, et le navigateur peut bloquer la première tentative tant
 * que l'accès au réseau local n'est pas autorisé (Chrome). Sans nouvel essai,
 * aucun marqueur n'arrivait de toute la passation. Le pont réessaie donc,
 * de plus en plus espacé (1 s, 2 s, 4 s… jusqu'à RECONNEXION_MAX_MS), et se
 * reconnecte si la connexion tombe. Les marqueurs émis entre-temps sont
 * gardés dans l'ordre et envoyés à la connexion ; chacun porte son heure
 * d'émission (`wallTime`, `timestamp`), que le relais peut utiliser pour
 * recaler les marqueurs arrivés en retard.
 */
export const RECONNEXION_MIN_MS = 1000
export const RECONNEXION_MAX_MS = 10000

export default class LSLBridge {
  constructor() {
    this.ws = null
    this.connected = false
    this.queue = []
    this.port = 12345
    this.stopped = false
    this.retryTimer = null
    this.delay = RECONNEXION_MIN_MS
    this.warned = false
  }

  // Résout à la première issue (connecté : true, échec : false), comme avant ;
  // les nouveaux essais continuent ensuite en arrière-plan.
  connect(port = 12345) {
    this.port = port
    this.stopped = false
    return new Promise((resolve) => this._open(resolve))
  }

  _open(resolve) {
    if (this.stopped) { resolve?.(false); return }
    let settled = false
    const done = (ok) => { if (!settled) { settled = true; resolve?.(ok) } }
    let ws
    try {
      ws = new WebSocket(`ws://localhost:${this.port}`)
    } catch {
      this.connected = false
      done(false)
      this._retry()
      return
    }
    this.ws = ws
    ws.onopen = () => {
      if (this.ws !== ws) return
      this.connected = true
      this.delay = RECONNEXION_MIN_MS
      this.warned = false
      // Envoyer les marqueurs gardés, dans l'ordre
      this.queue.forEach((m) => ws.send(JSON.stringify(m)))
      this.queue = []
      console.log('[LSL] Connected to relay on port', this.port)
      done(true)
    }
    ws.onerror = () => {
      if (this.ws !== ws) return
      if (!this.warned) {
        console.warn('[LSL] Could not connect to relay on port', this.port, '— retrying')
        this.warned = true
      }
      done(false)
    }
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.connected = false
      this.ws = null
      done(false)
      this._retry()
    }
  }

  _retry() {
    if (this.stopped || this.retryTimer) return
    const wait = this.delay
    this.delay = Math.min(this.delay * 2, RECONNEXION_MAX_MS)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this._open()
    }, wait)
  }

  send(marker, value = 1) {
    const msg = { marker, value, timestamp: performance.now(), wallTime: Date.now() }
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      this.queue.push(msg)
    }
  }

  disconnect() {
    this.stopped = true
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.ws) {
      const ws = this.ws
      this.ws = null
      this.connected = false
      ws.close()
    }
  }
}
