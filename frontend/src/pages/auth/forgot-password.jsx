import { useState } from 'react'
import Link from 'next/link'
import api from '../../lib/api'
import FlaskLogo from '../../components/FlaskLogo'
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
        <Link href="/" className={styles.leftLogo} aria-label="Retour à l'accueil">
          <span className={styles.leftLogoMark}>
            <FlaskLogo size={16} />
          </span>
          <span className={styles.leftLogoText}>MindCraft</span>
        </Link>
        <div className={styles.leftContent}>
          <h2 className={styles.leftTitle}>Mot de passe oubli&eacute; ?</h2>
          <p className={styles.leftSubtitle}>Pas de panique, nous allons vous envoyer un lien de r&eacute;initialisation.</p>
        </div>
        <p className={styles.leftFooter}>
          &copy; 2026 MindCraft &middot;{' '}
          <a
            href="https://github.com/mindcraft-research/mindcraft/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            AGPL-3.0
          </a>{' '}
          &middot;{' '}
          <Link href="/terms" className={styles.footerLink}>
            CGU non-commerciales
          </Link>
        </p>
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
