import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '../../lib/authStore'
import FlaskLogo from '../../components/FlaskLogo'
import styles from './auth.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const register = useAuthStore((s) => s.register)

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })

  // Pré-remplissage de l'email si on arrive depuis une page d'invitation
  // (/invitations/<token> → bouton « Créer un compte » avec ?email=...).
  useEffect(() => {
    if (router.isReady && router.query.email) {
      setForm((f) => ({ ...f, email: String(router.query.email) }))
    }
  }, [router.isReady, router.query.email])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [registered, setRegistered] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setErrors((e2) => ({ ...e2, [e.target.name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (form.username.length < 3) errs.username = 'Minimum 3 caractères.'
    if (!form.email.includes('@')) errs.email = 'Email invalide.'
    if (form.password.length < 8) errs.password = 'Minimum 8 caractères.'
    if (form.password !== form.confirm) errs.confirm = 'Les mots de passe ne correspondent pas.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      setRegistered(true)
      setRegisteredEmail(form.email)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className={styles.leftPanel}>
        <Link href="/" className={styles.leftLogo} aria-label="Retour à l'accueil">
          <span className={styles.leftLogoMark}>
            <FlaskLogo size={16} />
          </span>
          <span className={styles.leftLogoText}>MindCraft</span>
        </Link>

        <div className={styles.leftContent}>
          <h2 className={styles.leftTitle}>
            Bienvenue dans la communauté MindCraft
          </h2>
          <p className={styles.leftSubtitle}>
            Rejoignez les chercheurs qui font confiance à MindCraft pour leurs études expérimentales.
          </p>
          <div className={styles.leftFeatures}>
            {[
              { emoji: '👥', text: 'Projets collaboratifs' },
              { emoji: '🔀', text: 'Contrebalancement automatique' },
              { emoji: '⚡', text: 'Collecte Prolific en un clic' },
              { emoji: '🔒', text: 'Données RGPD conformes' },
            ].map((f) => (
              <div key={f.text} className={styles.leftFeature}>
                <span className={styles.leftFeatureEmoji}>{f.emoji}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <p className={styles.leftFooter}>
          © 2026 MindCraft ·{' '}
          <a
            href="https://github.com/mindcraft-research/mindcraft/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            AGPL-3.0
          </a>{' '}
          ·{' '}
          <Link href="/terms" className={styles.footerLink}>
            CGU non-commerciales
          </Link>
        </p>
      </div>

      {/* ── Right panel (form) ──────────────────────────────────────────────── */}
      <div className={styles.rightPanel}>
        <div className={styles.formWrap}>
          {registered ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F4E7;</div>
              <h1 className={styles.title}>V&eacute;rifiez votre bo&icirc;te e-mail</h1>
              <p className={styles.subtitle} style={{ marginBottom: 16 }}>
                Un lien de v&eacute;rification a &eacute;t&eacute; envoy&eacute; &agrave; <strong>{registeredEmail}</strong>.
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 24 }}>
                Cliquez sur le lien dans l&apos;e-mail pour activer votre compte. Pensez &agrave; v&eacute;rifier votre dossier spam.
              </p>
              <Link href="/auth/login" style={{ color: 'var(--brand)', fontSize: 14 }}>
                Aller &agrave; la page de connexion &rarr;
              </Link>
            </div>
          ) : (
          <>
          <div className={styles.formHeader}>
            <h1 className={styles.title}>Créer un compte</h1>
            <p className={styles.subtitle}>Commencez à concevoir vos études</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Nom d'utilisateur</label>
              <input
                id="username" name="username" type="text"
                className="form-input" placeholder="ex: dupont_m"
                value={form.username} onChange={handleChange}
                required autoComplete="username"
              />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Adresse e-mail</label>
              <input
                id="email" name="email" type="email"
                className="form-input" placeholder="vous@exemple.fr"
                value={form.email} onChange={handleChange}
                required autoComplete="email"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Mot de passe</label>
              <input
                id="password" name="password" type="password"
                className="form-input" placeholder="Minimum 8 caractères"
                value={form.password} onChange={handleChange}
                required autoComplete="new-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm">Confirmer le mot de passe</label>
              <input
                id="confirm" name="confirm" type="password"
                className="form-input" placeholder="••••••••"
                value={form.confirm} onChange={handleChange}
                required autoComplete="new-password"
              />
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>

            <p className={styles.rgpdNote}>
              En créant un compte, vos données sont stockées de façon sécurisée conformément au RGPD.
              Votre e-mail sert uniquement à la récupération de compte et aux invitations.
            </p>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <p className={styles.switchLink}>
            Déjà un compte ? <Link href="/auth/login">Se connecter</Link>
          </p>
          </>
          )}

        </div>
      </div>
    </div>
  )
}
