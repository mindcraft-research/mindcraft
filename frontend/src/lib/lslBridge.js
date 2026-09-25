/**
 * LSL Bridge — Pont WebSocket → Lab Streaming Layer
 *
 * Se connecte à un serveur relay local (Python/Node) qui retransmet
 * les marqueurs vers un flux LSL pour synchronisation avec EEG/ECG/Eyetracking.
 *
 * Dégradation gracieuse : si la connexion échoue, les marqueurs sont ignorés.
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

export default class LSLBridge {
  constructor() {
    this.ws = null
    this.connected = false
    this.queue = []
  }

  connect(port = 12345) {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(`ws://localhost:${port}`)
        this.ws.onopen = () => {
          this.connected = true
          // Flush queued markers
          this.queue.forEach((m) => this.ws.send(JSON.stringify(m)))
          this.queue = []
          console.log('[LSL] Connected to relay on port', port)
          resolve(true)
        }
        this.ws.onerror = () => {
          this.connected = false
          console.warn('[LSL] Could not connect to relay on port', port)
          resolve(false)
        }
        this.ws.onclose = () => {
          this.connected = false
        }
      } catch {
        this.connected = false
        resolve(false)
      }
    })
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
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.connected = false
    }
  }
}
