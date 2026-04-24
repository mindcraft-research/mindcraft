import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import api from '../../lib/api'
import FlaskLogo from '../../components/FlaskLogo'
import styles from './auth.module.css'

export default function VerifyEmailPage() {
  const router = useRouter()
  const { token } = router.query

  const [status, setStatus] = useState('loading') // loading | success | error
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!router.isReady || !token) return
    const verify = async () => {
      try {
        await api.post('/api/auth/verify-email', { token })
        setStatus('success')
      } catch (err) {
        setStatus('error')
        setError(err.response?.data?.error || 'Lien invalide ou expir\u00e9.')
      }
    }
    verify()
  }, [router.isReady, token])

  const handleResend = async () => {
    if (!resendEmail) return
    setResending(true)
    try {
      await api.post('/api/auth/resend-verification', { email: resendEmail })
      setResent(true)
    } catch {}
    setResending(false)
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
          <h2 className={styles.leftTitle}>V&eacute;rification de votre e-mail</h2>
          <p className={styles.leftSubtitle}>Un instant, nous activons votre compte...</p>
        </div>
        <p className={styles.leftFooter}>&copy; 2026 MindCraft &middot; Usage non-commercial</p>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formWrap}>
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>&#x23F3;</div>
              <h1 className={styles.title}>V&eacute;rification en cours...</h1>
              <p className={styles.subtitle}>Veuillez patienter quelques instants.</p>
            </div>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#x2705;</div>
              <h1 className={styles.title}>E-mail v&eacute;rifi&eacute; !</h1>
              <p className={styles.subtitle} style={{ marginBottom: 24 }}>
                Votre compte est maintenant activ&eacute;. Vous pouvez vous connecter.
              </p>
              <Link href="/auth/login" className="btn btn-primary btn-lg" style={{ display: 'inline-block' }}>
                Se connecter
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#x274C;</div>
              <h1 className={styles.title}>Lien expir&eacute; ou invalide</h1>
              <p className={styles.subtitle} style={{ marginBottom: 20 }}>{error}</p>

              {!resent ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                    Entrez votre adresse e-mail pour recevoir un nouveau lien :
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <input
                      type="email" className="form-input" style={{ maxWidth: 260 }}
                      value={resendEmail} onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="vous@exemple.fr"
                    />
                    <button className="btn btn-primary" onClick={handleResend} disabled={resending || !resendEmail}>
                      {resending ? '...' : 'Renvoyer'}
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--teal)' }}>
                  &#x2713; Un nouveau lien a &eacute;t&eacute; envoy&eacute;. V&eacute;rifiez votre bo&icirc;te e-mail.
                </p>
              )}

              <Link href="/auth/login" style={{ display: 'block', marginTop: 24, color: 'var(--gray-400)', fontSize: 13 }}>
                &larr; Retour &agrave; la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
