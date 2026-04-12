import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import api from '../../lib/api'
import styles from './auth.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { token, email } = router.query

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caract\u00e8res.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/api/auth/reset-password', { token, email, password })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Lien invalide ou expir\u00e9.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
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
          <h2 className={styles.leftTitle}>Nouveau mot de passe</h2>
          <p className={styles.leftSubtitle}>Choisissez un mot de passe s&eacute;curis&eacute; pour votre compte.</p>
        </div>
        <p className={styles.leftFooter}>&copy; 2026 MindCraft &middot; Usage acad&eacute;mique</p>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formWrap}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#x2705;</div>
              <h1 className={styles.title}>Mot de passe modifi&eacute; !</h1>
              <p className={styles.subtitle}>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <Link href="/auth/login" className="btn btn-primary btn-lg" style={{ display: 'inline-block', marginTop: 20 }}>
                Se connecter
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h1 className={styles.title}>R&eacute;initialiser le mot de passe</h1>
                <p className={styles.subtitle}>Choisissez un nouveau mot de passe (minimum 8 caract&egrave;res).</p>
              </div>
              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe</label>
                  <input type="password" className="form-input" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="Min. 8 caract\u00e8res" required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmer</label>
                  <input type="password" className="form-input" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError('') }} placeholder="Retapez le mot de passe" required />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }} disabled={loading || !token}>
                  {loading ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
