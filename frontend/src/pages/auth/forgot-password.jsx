import { useState } from 'react'
import Link from 'next/link'
import api from '../../lib/api'
import styles from './auth.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
    } catch {}
    setSent(true)
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        {/* Same left panel as login page */}
        <div className={styles.leftLogo}>
          <span className={styles.leftLogoMark}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 2.5H9.5V6.5L12.8 13.5H3.2L6.5 6.5V2.5Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="rgba(255,255,255,0.07)"/>
              <path d="M5.5 2.5H10.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M4.5 10.5L11.5 10.5L12.8 13.5H3.2Z" fill="rgba(255,255,255,0.28)"/>
              <circle cx="8.5" cy="9" r="1" stroke="rgba(255,255,255,0.65)" strokeWidth="0.9"/>
              <circle cx="6.8" cy="12" r="0.55" fill="rgba(255,255,255,0.55)"/>
            </svg>
          </span>
          <span className={styles.leftLogoText}>MindCraft</span>
        </div>
        <div className={styles.leftContent}>
          <h2 className={styles.leftTitle}>Mot de passe oubli&eacute; ?</h2>
          <p className={styles.leftSubtitle}>Pas de panique, nous allons vous envoyer un lien de r&eacute;initialisation.</p>
        </div>
        <p className={styles.leftFooter}>&copy; 2026 MindCraft &middot; Usage acad&eacute;mique</p>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formWrap}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F4E7;</div>
              <h1 className={styles.title}>V&eacute;rifiez votre bo&icirc;te e-mail</h1>
              <p className={styles.subtitle} style={{ marginBottom: 24 }}>
                Si un compte est associ&eacute; &agrave; <strong>{email}</strong>, un lien de r&eacute;initialisation a &eacute;t&eacute; envoy&eacute;.
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                Pensez &agrave; v&eacute;rifier votre dossier spam.
              </p>
              <Link href="/auth/login" style={{ display: 'block', marginTop: 24, color: 'var(--brand)', fontSize: 14 }}>
                &larr; Retour &agrave; la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h1 className={styles.title}>Mot de passe oubli&eacute;</h1>
                <p className={styles.subtitle}>Entrez votre adresse e-mail pour recevoir un lien de r&eacute;initialisation.</p>
              </div>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Adresse e-mail</label>
                  <input
                    id="email" type="email" className="form-input"
                    placeholder="vous@exemple.fr"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email" autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le lien de r\u00e9initialisation'}
                </button>
              </form>
              <p className={styles.switchLink}>
                <Link href="/auth/login">&larr; Retour &agrave; la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
