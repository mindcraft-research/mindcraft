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
  const { what = 'cet élément', title = 'Supprimer ?', detail, confirmLabel = 'Supprimer' } = req.opts || {}

  return (
    <div className={styles.overlay} onMouseDown={() => close(false)} role="presentation">
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.icon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 id="confirm-title" className={styles.title}>{title}</h2>
        <p className={styles.text}>Vous allez supprimer <strong>{what}</strong>.</p>
        <p className={styles.detail}>{detail || 'Cette action est irréversible.'}</p>
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={() => close(false)}>
            Annuler
          </button>
          <button type="button" className={`btn ${styles.danger}`} onClick={() => close(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
