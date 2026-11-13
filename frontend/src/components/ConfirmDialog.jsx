import { useState, useEffect, useRef, useCallback } from 'react'
import { registerConfirmHost } from '../lib/confirm'
import styles from './ConfirmDialog.module.css'

// Fenêtre de confirmation de suppression (cf. lib/confirm.js). Une seule
// instance, montée dans _app.jsx ; s'ouvre quand confirmDelete() est appelé.
export default function ConfirmDialogHost() {
  const [req, setReq] = useState(null) // { opts, resolve }
  const cancelRef = useRef(null)

  useEffect(() => registerConfirmHost((opts) => new Promise((resolve) => {
    // Une demande pendant qu'une autre est ouverte : on refuse la seconde.
    setReq((cur) => { if (cur) { resolve(false); return cur } return { opts, resolve } })
  })), [])

  const close = useCallback((answer) => {
    setReq((cur) => { cur?.resolve(answer); return null })
  }, [])

  // Le focus va sur « Annuler » : Entrée par réflexe ne supprime rien.
  useEffect(() => {
    if (!req) return
    cancelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [req, close])

  if (!req) return null
  const { what = 'cet élément', title = 'Supprimer ?', detail, confirmLabel = 'Supprimer', message, ton = 'suppression' } = req.opts || {}
  // Trois apparences : « suppression » (rouge, corbeille), « attention » (ambre,
  // on risque de perdre quelque chose) et « neutre » (bleu, simple confirmation).
  const neutre = ton === 'neutre'
  const attention = ton === 'attention'
  const couleur = neutre ? 'var(--brand, #4f46e5)' : attention ? '#B45309' : undefined
  const fond = neutre ? 'var(--brand-pale, #EEF2FF)' : attention ? '#FFFBEB' : undefined

  return (
    <div className={styles.overlay} onMouseDown={() => close(false)} role="presentation">
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.icon} aria-hidden="true" style={couleur ? { color: couleur, background: fond } : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            {neutre ? (
              <path d="M12 17v.01M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            ) : attention ? (
              <path d="M12 9v4M12 17v.01M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </div>
        <h2 id="confirm-title" className={styles.title} style={couleur ? { color: neutre ? 'var(--text-primary)' : couleur } : undefined}>{title}</h2>
        <p className={styles.text}>{message || <>Vous allez supprimer <strong>{what}</strong>.</>}</p>
        <p className={styles.detail}>{detail || 'Cette action est irréversible.'}</p>
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={() => close(false)}>
            Annuler
          </button>
          <button type="button" className={neutre ? 'btn btn-primary' : `btn ${styles.danger}`} style={attention ? { background: '#B45309' } : undefined} onClick={() => close(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
