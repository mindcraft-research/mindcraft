import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import api from '../../lib/api'
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
          <h2 className={styles.leftTitle}>V&eacute;rification de votre e-mail</h2>
          <p className={styles.leftSubtitle}>Un instant, nous activons votre compte...</p>
        </div>
        <p className={styles.leftFooter}>&copy; 2026 MindCraft &middot; Usage acad&eacute;mique</p>
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
