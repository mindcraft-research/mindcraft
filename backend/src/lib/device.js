// ─── TYPE D'APPAREIL DU PARTICIPANT ──────────────────────────────────────────
// Seule information technique gardée sur l'appareil : ordinateur | mobile |
// tablette (session.metadata.appareil). Le texte complet du navigateur (user
// agent) n'est plus enregistré (minimisation RGPD). Exporté seulement à la
// demande du chercheur (option « Inclure le type d'appareil »).
//
// La détection n'est pas fiable à 100 % : un iPad récent se présente comme un
// Mac, et un navigateur peut déclarer ce qu'il veut. Le runner corrige le cas
// de l'iPad grâce à l'écran tactile ; le serveur, lui, ne voit que le texte.

const APPAREILS = ['ordinateur', 'mobile', 'tablette']

function appareilDepuisUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return ''
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablette'
  if (/Mobi|iPhone|iPod|Android|Windows Phone|BlackBerry|Opera Mini/i.test(ua)) return 'mobile'
  return 'ordinateur'
}

// Type d'appareil d'une session : valeur enregistrée, ou déduite du user agent
// des sessions antérieures à ce changement (qui l'avaient encore).
function appareilDeSession(metadata) {
  const m = metadata && typeof metadata === 'object' ? metadata : {}
  if (APPAREILS.includes(m.appareil)) return m.appareil
  return appareilDepuisUserAgent(m.userAgent)
}

// Métadonnées de session acceptées à l'allocation : rien d'autre n'est stocké.
function metadataSession(brut) {
  const m = brut && typeof brut === 'object' ? brut : {}
  const out = {}
  if (typeof m.source === 'string') out.source = m.source.slice(0, 32)
  if (typeof m.lang === 'string') out.lang = m.lang.slice(0, 16)
  if (APPAREILS.includes(m.appareil)) out.appareil = m.appareil
  return out
}

module.exports = { APPAREILS, appareilDepuisUserAgent, appareilDeSession, metadataSession }
