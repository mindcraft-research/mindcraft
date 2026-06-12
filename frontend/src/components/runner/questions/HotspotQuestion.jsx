import { useRef } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const resolveUrl = (url) => {
  if (!url) return url
  if (url.startsWith('/')) return `${API}${url}`
  return url.replace(/^http:\/\/localhost:\d+/, API)
}

/**
 * Normalise la valeur stockée vers un tableau de points { x, y }.
 *
 * - `null` / `undefined` → []
 * - tableau → renvoyé tel quel (déjà au bon format)
 * - objet `{ x, y }` → `[{ x, y }]` (compatibilité avec les anciennes
 *   réponses enregistrées sous l'ancien format single-point avant la
 *   correction du bug multi-clics, issue #83 relance point b)
 */
function normalizeValue(v) {
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object' && v.x != null && v.y != null) return [{ x: v.x, y: v.y }]
  return []
}

export default function HotspotQuestion({ question, value, onChange }) {
  // Référence sur l'IMG (pas sur le conteneur externe) : indispensable pour
  // que `getBoundingClientRect()` retourne exactement la zone visible de
  // l'image. Si on prenait le conteneur, on aurait inclus le bandeau « N/M
  // clics » sous l'image → décalage vertical du marqueur (bug rapporté
  // dans l'issue #83 relance, point b).
  const imgRef = useRef()
  const settings = question.settings || {}
  const imageUrl = resolveUrl(settings.url)
  const maxW = settings.maxWidth || 600
  const maxClicks = Math.max(1, Number(settings.maxClicks) || 1)
  const points = normalizeValue(value)

  const handleClick = (e) => {
    const rect = imgRef.current.getBoundingClientRect()
    const x = Number(((e.clientX - rect.left) / rect.width * 100).toFixed(1))
    const y = Number(((e.clientY - rect.top) / rect.height * 100).toFixed(1))
    let next
    if (points.length < maxClicks) {
      // On n'a pas encore atteint la limite : on ajoute le clic à la liste.
      next = [...points, { x, y }]
    } else if (maxClicks === 1) {
      // Mode mono-clic : le nouveau clic remplace l'ancien.
      next = [{ x, y }]
    } else {
      // Multi-clics, limite atteinte : on ignore les clics supplémentaires.
      // L'utilisateur·rice doit retirer un point (croix × sur le marqueur)
      // pour pouvoir en ajouter un autre.
      return
    }
    onChange(next)
  }

  const removePoint = (e, idx) => {
    // stopPropagation pour que le clic sur la croix ne soit pas réinterprété
    // comme un nouveau clic sur l'image (sinon on retire un point ET on en
    // ajoute un autre au même endroit).
    e.stopPropagation()
    onChange(points.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'inline-block', maxWidth: maxW }}>
      {/* Conteneur dimensionné EXACTEMENT comme l'image, sans rien d'autre
          à l'intérieur — les marqueurs sont positionnés en `%` par rapport
          à ce conteneur, donc tout élément en plus (bandeau, légende, etc.)
          décalerait les coordonnées. C'est précisément le bug d'origine :
          le conteneur contenait à la fois l'image ET le texte « Position :
          x%, y% », d'où un décalage vertical du marqueur. */}
      <div style={{ position: 'relative', display: 'inline-block', cursor: 'crosshair', lineHeight: 0 }}>
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Zone cliquable"
          onClick={handleClick}
          style={{
            width: '100%',
            display: 'block',
            borderRadius: 8,
            border: '1.5px solid var(--gray-200)',
            boxSizing: 'border-box',
          }}
          draggable={false}
        />
        {points.map((p, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: 'translate(-50%, -50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.75)',
              border: '2.5px solid #fff',
              boxShadow: '0 0 0 2px rgba(239,68,68,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'sans-serif',
              userSelect: 'none',
              pointerEvents: maxClicks > 1 ? 'auto' : 'none',
              cursor: maxClicks > 1 ? 'pointer' : 'default',
            }}
            title={maxClicks > 1 ? 'Cliquer pour retirer ce point' : undefined}
            onClick={maxClicks > 1 ? (e) => removePoint(e, idx) : undefined}
          >
            {maxClicks > 1 ? '×' : ''}
          </div>
        ))}
      </div>

      {/* Bandeau d'état SOUS l'image (et hors du conteneur positionné) :
          il n'influence pas les coordonnées des marqueurs. */}
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-500)', textAlign: 'center', lineHeight: 1.4 }}>
        {points.length === 0 ? (
          maxClicks > 1
            ? `Cliquez sur l'image (jusqu'à ${maxClicks} points)`
            : `Cliquez sur l'image`
        ) : maxClicks === 1 ? (
          <>Position : {points[0].x}% , {points[0].y}%</>
        ) : (
          <>
            {points.length} / {maxClicks} clic{points.length > 1 ? 's' : ''}
            {points.length === maxClicks && ' — limite atteinte, retirez un point (×) pour en ajouter un autre'}
          </>
        )}
      </div>
    </div>
  )
}
