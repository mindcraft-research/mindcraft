// Type d'appareil du participant : 'ordinateur' | 'mobile' | 'tablette'.
// Seule information technique enregistrée sur l'appareil (le texte complet du
// navigateur ne l'est plus). Exportée seulement si le chercheur coche
// « Inclure le type d'appareil ». Indicatif : un navigateur peut déclarer ce
// qu'il veut. Même règles que backend/src/lib/device.js, plus le cas de l'iPad
// récent, qui se présente comme un Mac mais a un écran tactile.
export function detecterAppareil() {
  if (typeof navigator === 'undefined') return undefined
  const ua = navigator.userAgent || ''
  const tactile = (navigator.maxTouchPoints || 0) > 1
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablette'
  if (/Macintosh/i.test(ua) && tactile) return 'tablette'
  if (/Mobi|iPhone|iPod|Android|Windows Phone|BlackBerry|Opera Mini/i.test(ua)) return 'mobile'
  return 'ordinateur'
}
