import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore from '../../lib/authStore'
import FlaskLogo from '../../components/FlaskLogo'
import styles from './auth.module.css'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [form, setForm] = useState({ login: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needs2FA, setNeeds2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleChange = (e) => { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await login(form.login, form.password)
      if (result?.requiresTwoFactor) {
        setNeeds2FA(true)
        setTempToken(result.tempToken)
        setLoading(false)
        return
      }
      toast.success('Bienvenue !')
      router.push('/dashboard')
    } catch (err) {
      const data = err.response?.data
      if (data?.emailNotVerified) {
        setEmailNotVerified(true)
        setUnverifiedEmail(data.email || form.login)
      } else {
        const msg = data?.error || 'Erreur de connexion. Vérifiez vos identifiants.'
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    try {
      await api.post('/api/auth/resend-verification', { email: unverifiedEmail })
      setResent(true)
    } catch {}
    setResending(false)
  }

  const handle2FAVerify = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/2fa/login-verify', { tempToken, code: twoFactorCode })
      localStorage.setItem('accessToken', data.accessToken)
      useAuthStore.setState({ user: data.user, isAuthenticated: true })
      toast.success('Bienvenue !')
      router.push('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Code invalide')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftLogo}>
          <span className={styles.leftLogoMark}>
            <FlaskLogo size={16} />
          </span>
          <span className={styles.leftLogoText}>MindCraft</span>
        </div>

        <div className={styles.leftContent}>
          <h2 className={styles.leftTitle}>
            L'expérimentation enfin à la portée de tout le monde.
          </h2>
          <p className={styles.leftSubtitle}>
            Concevez vos études sans coder ni payer.
          </p>
          <div className={styles.leftFeatures}>
            {[
              { emoji: '📝', text: 'Implémentation de questionnaires' },
              { emoji: '🧠', text: 'Conception de tâche comportementale' },
              { emoji: '📊', text: "Extraction des données avec synthèse de l'étude" },
              { emoji: '🔒', text: 'Protection des données RGPD et stockage en France' },
            ].map((f) => (
              <div key={f.text} className={styles.leftFeature}>
                <span className={styles.leftFeatureEmoji}>{f.emoji}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <p className={styles.leftFooter}>© 2026 MindCraft · Usage non-commercial</p>
      </div>

      {/* ── Right panel (form) ──────────────────────────────────────────────── */}
      <div className={styles.rightPanel}>
        <div className={styles.formWrap}>
          {needs2FA ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>&#x1F510;</div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--navy)', margin: '0 0 8px' }}>Vérification en deux étapes</h2>
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Entrez le code à 6 chiffres de votre application d'authentification.</p>
              </div>
              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  style={{ width: 160, padding: '12px 16px', border: '2px solid var(--brand)', borderRadius: 10, fontSize: 28, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 8, color: 'var(--navy)' }}
                />
              </div>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handle2FAVerify}
                disabled={loading || twoFactorCode.length !== 6}
              >
                {loading ? 'Vérification...' : 'Vérifier'}
              </button>
              <button
                style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center' }}
                onClick={() => { setNeeds2FA(false); setTempToken(''); setTwoFactorCode(''); setError('') }}
              >
                ← Retour à la connexion
              </button>
            </div>
          ) : emailNotVerified ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>&#x1F4E7;</div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--navy)', margin: '0 0 8px' }}>Adresse e-mail non v&eacute;rifi&eacute;e</h2>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                Vous devez v&eacute;rifier votre adresse e-mail avant de vous connecter.
              </p>
              {resent ? (
                <p style={{ fontSize: 13, color: 'var(--teal)' }}>&#x2713; Un nouveau lien de v&eacute;rification a &eacute;t&eacute; envoy&eacute; &agrave; {unverifiedEmail}</p>
              ) : (
                <button className="btn btn-primary" onClick={handleResendVerification} disabled={resending} style={{ width: '100%' }}>
                  {resending ? 'Envoi...' : 'Renvoyer le lien de v\u00e9rification'}
                </button>
              )}
              <button
                style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: 12, cursor: 'pointer', width: '100%' }}
                onClick={() => { setEmailNotVerified(false); setResent(false); setError('') }}
              >
                &larr; Retour &agrave; la connexion
              </button>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h1 className={styles.title}>Connexion</h1>
                <p className={styles.subtitle}>Accédez à vos études et projets</p>
              </div>

              {router.query.reason === 'timeout' && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
                  Votre session a expiré après 30 minutes d'inactivité. Veuillez vous reconnecter.
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="form-group">
                  <label className="form-label" htmlFor="login">E-mail ou nom d'utilisateur</label>
                  <input
                    id="login" name="login" type="text"
                    className="form-input"
                    placeholder="vous@exemple.fr ou votre pseudo"
                    value={form.login}
                    onChange={handleChange}
                    required autoComplete="username"
                  />
                </div>

                <div className="form-group">
                  <label className={`form-label ${styles.passwordLabel}`} htmlFor="password">
                    <span>Mot de passe</span>
                    <Link href="/auth/forgot-password" className={styles.forgotLink}>
                      Mot de passe oublié ?
                    </Link>
                  </label>
                  <input
                    id="password" name="password" type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    color: '#b91c1c',
                    fontSize: 13,
                    textAlign: 'center',
                    marginTop: 4,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className={`btn btn-primary btn-lg ${styles.loginButton}`}
                  style={{ width: '100%', marginTop: 4 }}
                  disabled={loading}
                >
                  {loading ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>

              <p className={styles.switchLink}>
                Pas encore de compte ?{' '}
                <Link href="/auth/register">Créer un compte</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
