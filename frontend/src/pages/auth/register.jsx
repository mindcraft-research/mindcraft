import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import useAuthStore from '../../lib/authStore'
import styles from './auth.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const register = useAuthStore((s) => s.register)

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

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
      toast.success('Compte créé avec succès !')
      router.push('/dashboard')
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
          <h2 className={styles.leftTitle}>
            Bienvenue dans la communauté MindCraft
          </h2>
          <p className={styles.leftSubtitle}>
            Rejoignez les chercheurs qui font confiance à MindCraft pour leurs études expérimentales.
          </p>
          <div className={styles.leftFeatures}>
            {['Projets collaboratifs', 'Contrebalancement automatique', 'Collecte Prolific en un clic', 'Données RGPD conformes'].map((f) => (
              <div key={f} className={styles.leftFeature}>
                <span className={styles.leftFeatureDot} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className={styles.leftFooter}>© 2026 MindCraft · Usage académique</p>
      </div>

      {/* ── Right panel (form) ──────────────────────────────────────────────── */}
      <div className={styles.rightPanel}>
        <div className={styles.formWrap}>
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


        </div>
      </div>
    </div>
  )
}
