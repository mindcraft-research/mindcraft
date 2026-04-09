import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import styles from './ParticipationLinkPanel.module.css'

const FRONTEND_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000')

export default function ParticipationLinkPanel({ study, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const studyUrl = `${FRONTEND_URL}/run/${study.id}`
  const prolificUrl = `${studyUrl}?PROLIFIC_PID={{%PROLIFIC_PID%}}`
  const previewUrl = `${studyUrl}?preview=1`

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copié !'))
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await api.patch(`/api/studies/${study.id}/status`, { status: 'COLLECTING' })
      toast.success('Étude publiée — les participants peuvent maintenant y accéder.')
      onStatusChange?.()
    } catch {
      toast.error('Erreur lors de la publication.')
    } finally {
      setPublishing(false)
    }
  }

  const handleClose = async () => {
    setPublishing(true)
    try {
      await api.patch(`/api/studies/${study.id}/status`, { status: 'ARCHIVED' })
      toast.success('Collecte terminée.')
      onStatusChange?.()
    } catch {
      toast.error('Erreur.')
    } finally {
      setPublishing(false)
    }
  }

  const isCollecting = study.status === 'COLLECTING'

  return (
    <div className={styles.wrap}>
      <button className={`btn btn-secondary btn-sm ${styles.triggerBtn}`} onClick={() => setOpen(!open)}>
        Lien participation
      </button>

      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Portail participant</span>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className={styles.panelBody}>

              {/* Statut & publication */}
              <div className={styles.statusRow}>
                <span className={`badge badge-${STATUS_COLOR[study.status]}`}>
                  {STATUS_LABEL[study.status]}
                </span>
                {!isCollecting && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    Publier (passer en COLLECTING)
                  </button>
                )}
                {isCollecting && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleClose}
                    disabled={publishing}
                  >
                    Fermer la collecte
                  </button>
                )}
              </div>

              {!isCollecting && (
                <div className={styles.warningBox}>
                  L'étude doit être en statut <strong>COLLECTING</strong> pour que les participants puissent y accéder.
                </div>
              )}

              {/* Prévisualisation chercheur */}
              <div className={styles.linkGroup}>
                <div className={styles.linkLabel}>Prévisualisation (chercheur)</div>
                <div className={styles.linkRow}>
                  <input className={`form-input ${styles.linkInput}`} readOnly value={previewUrl} />
                  <button className="btn btn-secondary btn-sm" onClick={() => copy(previewUrl)}>Copier</button>
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Ouvrir</a>
                </div>
                <div className={styles.linkNote}>Accessible même si l'étude n'est pas en COLLECTING.</div>
              </div>

              {/* URL standard */}
              <div className={styles.linkGroup}>
                <div className={styles.linkLabel}>URL de participation</div>
                <div className={styles.linkRow}>
                  <input className={`form-input ${styles.linkInput}`} readOnly value={studyUrl} />
                  <button className="btn btn-secondary btn-sm" onClick={() => copy(studyUrl)}>Copier</button>
                </div>
              </div>

              {/* URL Prolific */}
              <div className={styles.linkGroup}>
                <div className={styles.linkLabel}>URL Prolific</div>
                <div className={styles.linkRow}>
                  <input className={`form-input ${styles.linkInput}`} readOnly value={prolificUrl} />
                  <button className="btn btn-secondary btn-sm" onClick={() => copy(prolificUrl)}>Copier</button>
                </div>
                <div className={styles.linkNote}>
                  Coller cette URL dans le champ "Study URL" sur Prolific.
                  Le code <code>{'{{%PROLIFIC_PID%}}'}</code> sera remplacé automatiquement par l'ID du participant.
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}

const STATUS_LABEL = {
  DRAFT: 'Brouillon', REVIEW: 'En révision',
  VALIDATED: 'Validée', COLLECTING: 'En collecte', ARCHIVED: 'Archivée',
}
const STATUS_COLOR = {
  DRAFT: 'gray', REVIEW: 'amber', VALIDATED: 'teal', COLLECTING: 'blue', ARCHIVED: 'coral',
}
