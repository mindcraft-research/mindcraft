/* ── Flask logo partagé — design moderne avec bulles en ébullition ────────────
 * Les bulles sont animées via les classes globales `.flask-bubble` / `.flask-bubble-N`
 * définies dans `src/styles/globals.css`.
 * Usage : <FlaskLogo size={24} />
 * ──────────────────────────────────────────────────────────────────────────── */
export default function FlaskLogo({ size = 16 }) {
  const sw = size >= 40 ? 1.4 : 1.6
  // Id unique pour le clipPath (évite les collisions quand le même logo est rendu
  // plusieurs fois avec la même taille sur la page)
  const clipId = `liquid-clip-${size}-${Math.random().toString(36).slice(2, 8)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ouverture du col */}
      <path d="M9 3.5h6" stroke="white" strokeWidth={sw} strokeLinecap="round" />
      {/* Corps du flask */}
      <path
        d="M10 3.5v5.8L4.8 19.1a1.6 1.6 0 0 0 1.45 2.4h11.5a1.6 1.6 0 0 0 1.45-2.4L14 9.3V3.5"
        stroke="white"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.06)"
      />
      {/* Liquide */}
      <defs>
        <clipPath id={clipId}>
          <path d="M7.2 15.2 h9.6 l2.1 4 a1.6 1.6 0 0 1-1.45 2.3 h-11 a1.6 1.6 0 0 1-1.45-2.3 z" />
        </clipPath>
      </defs>
      <path
        d="M7.2 15.2 h9.6 l2.1 4 a1.6 1.6 0 0 1-1.45 2.3 h-11 a1.6 1.6 0 0 1-1.45-2.3 z"
        fill="rgba(255,255,255,0.32)"
      />
      {/* Bulles en ébullition — clippées par le liquide */}
      <g clipPath={`url(#${clipId})`}>
        <circle className="flask-bubble flask-bubble-1"  cx="10.3" cy="21"   r="0.95" fill="rgba(255,255,255,0.95)" />
        <circle className="flask-bubble flask-bubble-2"  cx="13.7" cy="21.3" r="0.7"  fill="rgba(255,255,255,0.85)" />
        <circle className="flask-bubble flask-bubble-3"  cx="11.8" cy="21.2" r="0.55" fill="rgba(255,255,255,0.8)" />
        <circle className="flask-bubble flask-bubble-4"  cx="15.2" cy="21.4" r="0.45" fill="rgba(255,255,255,0.75)" />
        <circle className="flask-bubble flask-bubble-5"  cx="8.8"  cy="21.3" r="0.6"  fill="rgba(255,255,255,0.8)" />
        <circle className="flask-bubble flask-bubble-6"  cx="12.9" cy="21.5" r="0.5"  fill="rgba(255,255,255,0.85)" />
        <circle className="flask-bubble flask-bubble-7"  cx="9.6"  cy="21.4" r="0.4"  fill="rgba(255,255,255,0.7)" />
        <circle className="flask-bubble flask-bubble-8"  cx="14.5" cy="21.2" r="0.6"  fill="rgba(255,255,255,0.85)" />
        <circle className="flask-bubble flask-bubble-9"  cx="11.1" cy="21.5" r="0.35" fill="rgba(255,255,255,0.65)" />
        <circle className="flask-bubble flask-bubble-10" cx="16.1" cy="21.3" r="0.45" fill="rgba(255,255,255,0.75)" />
      </g>
    </svg>
  )
}
