import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import FlaskLogo from './FlaskLogo'
import styles from './GlobalMenu.module.css'

const LINKS = [
  {
    href: '/about',
    label: 'À propos',
    desc: 'Objectif et principes de MindCraft',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    ),
  },
  {
    href: '/docs',
    label: 'Documentation',
    desc: 'Guide complet de la plateforme',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
    ),
  },
  {
    href: '/terms',
    label: 'Termes et Conditions',
    desc: 'Crédits, usage et RGPD',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>
    ),
  },
  {
    href: '/help',
    label: 'Aide',
    desc: 'FAQ et support',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
      </svg>
    ),
  },
]

export default function GlobalMenu() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const btnRef = useRef(null)
  const router = useRouter()

  // Fermer au changement de route
  useEffect(() => {
    setOpen(false)
  }, [router.pathname])

  // Fermer en cliquant en dehors
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Fermer avec Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <>
      {/* ── Bouton burger fixe ── */}
      <button
        ref={btnRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu informations"
        title="À propos · Documentation · Aide"
      >
        {open ? (
          /* Icône croix */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          /* Icône burger */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div ref={panelRef} className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelLogo}>
              <FlaskLogo size={14} />
              <span className={styles.panelLogoText}>MindCraft</span>
            </div>
            <p className={styles.panelSub}>Usage non-commercial</p>
          </div>

          <nav className={styles.panelNav}>
            {LINKS.map((item) => {
              const active = router.pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.panelLink} ${active ? styles.panelLinkActive : ''}`}
                >
                  <span className={`${styles.panelLinkIcon} ${active ? styles.panelLinkIconActive : ''}`}>
                    {item.icon}
                  </span>
                  <span className={styles.panelLinkBody}>
                    <span className={styles.panelLinkLabel}>{item.label}</span>
                    <span className={styles.panelLinkDesc}>{item.desc}</span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.panelLinkArrow}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              )
            })}
          </nav>

          <div className={styles.panelFooter}>
            © 2026 MindCraft · v1.0
          </div>
        </div>
      )}
    </>
  )
}
