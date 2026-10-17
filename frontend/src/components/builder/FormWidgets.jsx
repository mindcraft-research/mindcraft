import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './BlockInspector.module.css'

// Info-bulle : s'ouvre au survol, au clavier (focus) et au clic (toucher) ;
// un clic la garde ouverte jusqu'au clic suivant, à Échap ou au défilement.
// Rendue dans <body>, en position fixe : elle n'est pas coupée par les
// panneaux qui défilent. L'espace avant l'icône la sépare du texte qui la
// précède ; dans un conteneur flex (qui a son propre écart), elle est ignorée.
export function Tooltip({ text }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null) // { top, left, dessus }
  const [epinglee, setEpinglee] = useState(false)

  const ouvrir = useCallback(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const largeur = Math.min(300, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left + r.width / 2 - largeur / 2, window.innerWidth - largeur - 8))
    const dessus = r.bottom + 160 > window.innerHeight && r.top > 160
    setPos({ left, largeur, top: dessus ? r.top - 6 : r.bottom + 6, dessus })
  }, [])
  const fermer = useCallback(() => { setPos(null); setEpinglee(false) }, [])

  useEffect(() => {
    if (!pos) return undefined
    const surTouche = (e) => { if (e.key === 'Escape') fermer() }
    const surClic = (e) => { if (!ref.current?.contains(e.target)) fermer() }
    window.addEventListener('keydown', surTouche)
    window.addEventListener('mousedown', surClic)
    window.addEventListener('scroll', fermer, true)
    window.addEventListener('resize', fermer)
    return () => {
      window.removeEventListener('keydown', surTouche)
      window.removeEventListener('mousedown', surClic)
      window.removeEventListener('scroll', fermer, true)
      window.removeEventListener('resize', fermer)
    }
  }, [pos, fermer])

  if (!text) return null
  return (
    <>{' '}<span
      ref={ref}
      className={styles.tooltipWrap}
      role="button"
      tabIndex={0}
      aria-label={text}
      aria-expanded={!!pos}
      onMouseEnter={ouvrir}
      onMouseLeave={() => { if (!epinglee) fermer() }}
      onFocus={ouvrir}
      onBlur={fermer}
      // Dans un <label>, le clic ne doit pas activer le champ associé.
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation()
        if (epinglee) fermer(); else { ouvrir(); setEpinglee(true) }
      }}
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.1"/>
        <path d="M6.5 5.5v4M6.5 4v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      {pos && typeof document !== 'undefined' && createPortal(
        <span
          role="tooltip"
          className={styles.tooltipBulle}
          style={{ top: pos.top, left: pos.left, width: pos.largeur, transform: pos.dessus ? 'translateY(-100%)' : undefined }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span></>
  )
}

export function Toggle({ value, onChange }) {
  return (
    <div
      className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
      onClick={() => onChange(!value)}
    />
  )
}
