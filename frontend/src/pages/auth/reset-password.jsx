import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import api from '../../lib/api'
import FlaskLogo from '../../components/FlaskLogo'
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
        <Link href="/" className={styles.leftLogo} aria-label="Retour à l'accueil">
          <span className={styles.leftLogoMark}>
            <FlaskLogo size={16} />
          </span>
          <span className={styles.leftLogoText}>MindCraft</span>
        </Link>
        <div className={styles.leftContent}>
          <h2 className={styles.leftTitle}>Nouveau mot de passe</h2>
          <p className={styles.leftSubtitle}>Choisissez un mot de passe s&eacute;curis&eacute; pour votre compte.</p>
        </div>
        <p className={styles.leftFooter}>&copy; 2026 MindCraft &middot; Usage non-commercial</p>
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
