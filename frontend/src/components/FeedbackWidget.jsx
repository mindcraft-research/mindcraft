import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import api from '../lib/api'
import styles from './FeedbackWidget.module.css'

const TYPES = [
  { value: 'BUG', label: 'Bug', icon: '🐛' },
  { value: 'SUGGESTION', label: 'Suggestion', icon: '💡' },
  { value: 'FEATURE', label: 'Fonctionnalité', icon: '✨' },
]

const STATUS_LABELS = { OPEN: 'Ouvert', SEEN: 'Lu', RESOLVED: 'Résolu' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function FeedbackWidget() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('new') // 'new' | 'history'
  const [type, setType] = useState('BUG')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load history when switching to history tab
  useEffect(() => {
    if (open && tab === 'history') {
      setLoadingHistory(true)
      api.get('/api/feedback/mine')
        .then(res => setHistory(res.data))
        .catch(() => {})
        .finally(() => setLoadingHistory(false))
    }
  }, [open, tab])

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 5) return
    setSending(true)
    try {
      await api.post('/api/feedback', {
        type,
        message: message.trim(),
        page: router.asPath,
      })
      setSent(true)
      setMessage('')
      toast.success('Merci pour votre retour !')
    } catch {
      toast.error('Erreur lors de l\'envoi.')
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setSent(false)
    setType('BUG')
    setMessage('')
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return createPortal(
    <>
      {/* Floating trigger button */}
      <button className={styles.trigger} onClick={() => setOpen(o => !o)} title="Feedback">
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>Votre avis compte</span>
            <button className={styles.headerClose} onClick={() => setOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'new' ? styles.tabActive : ''}`} onClick={() => { setTab('new'); setSent(false) }}>
              Nouveau
            </button>
            <button className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`} onClick={() => setTab('history')}>
              Historique
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {tab === 'new' && !sent && (
              <>
                {/* Type selector */}
                <div className={styles.typeSelector}>
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      className={`${styles.typeBtn} ${type === t.value ? styles.typeBtnActive : ''}`}
                      onClick={() => setType(t.value)}
                    >
                      <span className={styles.typeIcon}>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  className={styles.textarea}
                  placeholder={
                    type === 'BUG' ? 'Décrivez le problème rencontré...'
                    : type === 'SUGGESTION' ? 'Décrivez votre suggestion...'
                    : 'Décrivez la fonctionnalité souhaitée...'
                  }
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={2000}
                />
                <div className={styles.charCount}>{message.length} / 2000</div>

                {/* Submit */}
                <div className={styles.submitRow}>
                  <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={sending || message.trim().length < 5}
                  >
                    {sending ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}

            {tab === 'new' && sent && (
              <div className={styles.success}>
                <div className={styles.successIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className={styles.successText}>Feedback envoyé !</div>
                <div className={styles.successSub}>Merci de nous aider à améliorer MindCraft.</div>
                <button className={styles.newBtn} onClick={resetForm}>Envoyer un autre feedback</button>
              </div>
            )}

            {tab === 'history' && (
              loadingHistory ? (
                <div className={styles.historyEmpty}>Chargement...</div>
              ) : history.length === 0 ? (
                <div className={styles.historyEmpty}>Aucun feedback envoyé pour le moment.</div>
              ) : (
                <div className={styles.historyList}>
                  {history.map(fb => (
                    <div key={fb.id} className={styles.historyItem}>
                      <div className={styles.historyMeta}>
                        <span className={`${styles.historyType} ${
                          fb.type === 'BUG' ? styles.typeBug
                          : fb.type === 'SUGGESTION' ? styles.typeSuggestion
                          : styles.typeFeature
                        }`}>
                          {fb.type === 'BUG' ? 'Bug' : fb.type === 'SUGGESTION' ? 'Suggestion' : 'Fonctionnalité'}
                        </span>
                        <span className={styles.historyDate}>{formatDate(fb.createdAt)}</span>
                        <span className={styles.historyStatus}>
                          <span className={`${styles.statusDot} ${
                            fb.status === 'OPEN' ? styles.statusOpen
                            : fb.status === 'SEEN' ? styles.statusSeen
                            : styles.statusResolved
                          }`} />
                          {STATUS_LABELS[fb.status]}
                        </span>
                      </div>
                      <div className={styles.historyMsg}>{fb.message}</div>

                      {fb.adminReply && (
                        <div className={styles.historyReply}>
                          <div className={styles.historyReplyLabel}>
                            ✉️ Réponse de l’équipe MindCraft
                            {fb.repliedAt && <span className={styles.historyReplyDate}> · {formatDate(fb.repliedAt)}</span>}
                          </div>
                          <div className={styles.historyReplyMsg}>{fb.adminReply}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
