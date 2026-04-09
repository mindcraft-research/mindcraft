import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import api from '../lib/api'
import useAuthStore from '../lib/authStore'
import styles from './settings.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  // Profile
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Institutional
  const [institution, setInstitution] = useState('')
  const [laboratory, setLaboratory] = useState('')
  const [status, setStatus] = useState('')
  const [institutionSaving, setInstitutionSaving] = useState(false)

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [setting2FA, setSetting2FA] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [secret2FA, setSecret2FA] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisable, setShowDisable] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
      setTwoFactorEnabled(!!user.twoFactorEnabled)
      const p = user.profile || {}
      setInstitution(p.institution || '')
      setLaboratory(p.laboratory || '')
      setStatus(p.status || '')
    }
  }, [user, isLoading])

  // ── Profile ─────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    try {
      const { data } = await api.patch('/api/auth/profile', { username, email })
      useAuthStore.setState({ user: { ...user, ...data.user } })
      toast.success('Profil mis à jour')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    } finally {
      setProfileSaving(false)
    }
  }

  // ── Password ────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    setPasswordSaving(true)
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword })
      toast.success('Mot de passe modifié')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    } finally {
      setPasswordSaving(false)
    }
  }

  // ── 2FA Setup ───────────────────────────────────────────
  const handleSetup2FA = async () => {
    setSetting2FA(true)
    try {
      const { data } = await api.post('/api/auth/2fa/setup')
      setQrCode(data.qrCode)
      setSecret2FA(data.secret)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
      setSetting2FA(false)
    }
  }

  const handleVerify2FA = async () => {
    try {
      await api.post('/api/auth/2fa/verify', { code: verifyCode })
      setTwoFactorEnabled(true)
      setQrCode(null)
      setSecret2FA('')
      setVerifyCode('')
      setSetting2FA(false)
      useAuthStore.setState({ user: { ...user, twoFactorEnabled: true } })
      toast.success('Double authentification activée !')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Code invalide')
    }
  }

  const handleDisable2FA = async () => {
    try {
      await api.post('/api/auth/2fa/disable', { password: disablePassword })
      setTwoFactorEnabled(false)
      setShowDisable(false)
      setDisablePassword('')
      useAuthStore.setState({ user: { ...user, twoFactorEnabled: false } })
      toast.success('Double authentification désactivée')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur')
    }
  }

  if (isLoading || !user) return null

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Paramètres du compte</h1>
        <p className={styles.subtitle}>Gérez votre profil, votre mot de passe et la sécurité de votre compte.</p>

        {/* ── PROFIL ──────────────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Profil</h2>
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <label className={styles.label}>Nom d'utilisateur</label>
              <input className={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Adresse e-mail</label>
              <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Membre depuis</label>
              <input className={styles.input} value={new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} disabled style={{ background: 'var(--gray-50)', color: 'var(--gray-400)' }} />
            </div>
          </div>
          <button className={styles.btnPrimary} onClick={handleSaveProfile} disabled={profileSaving}>
            {profileSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>

        {/* ── INFOS INSTITUTIONNELLES ──────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Informations institutionnelles</h2>
          <div className={styles.fieldGroup}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Institution / Université</label>
                <input className={styles.input} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="ex : Université Paris-Saclay" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Laboratoire</label>
                <input className={styles.input} value={laboratory} onChange={(e) => setLaboratory(e.target.value)} placeholder="ex : LISN, LaPsyDÉ, CLLE" />
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Statut</label>
                <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  <option value="etudiant_l">Étudiant·e en licence</option>
                  <option value="etudiant_m">Étudiant·e en master</option>
                  <option value="doctorant">Doctorant·e</option>
                  <option value="mcf">Maître·sse de conférences</option>
                  <option value="professeur">Professeur·e des universités</option>
                  <option value="chercheur">Chercheur·se (CNRS, INSERM, etc.)</option>
                  <option value="ingenieur">Ingénieur·e de recherche</option>
                  <option value="postdoc">Post-doctorant·e</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
          </div>
          <button className={styles.btnPrimary} onClick={async () => {
            setInstitutionSaving(true)
            try {
              const profile = { institution, laboratory, status }
              const { data } = await api.patch('/api/auth/profile', { profile })
              useAuthStore.setState({ user: { ...user, ...data.user } })
              toast.success('Informations institutionnelles sauvegardées')
            } catch (err) {
              toast.error(err.response?.data?.error || 'Erreur')
            } finally {
              setInstitutionSaving(false)
            }
          }} disabled={institutionSaving}>
            {institutionSaving ? 'Sauvegarde...' : 'Sauvegarder les informations'}
          </button>
        </div>

        {/* ── MOT DE PASSE ────────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Mot de passe</h2>
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <label className={styles.label}>Mot de passe actuel</label>
              <input className={styles.input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Nouveau mot de passe</label>
                <input className={styles.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 caractères" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirmer</label>
                <input className={styles.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retapez le mot de passe" />
              </div>
            </div>
          </div>
          <button className={styles.btnPrimary} onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword}>
            {passwordSaving ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </div>

        {/* ── 2FA ─────────────────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Double authentification (2FA)</h2>

          {twoFactorEnabled && !showDisable && (
            <div>
              <div className={styles.badge2faOn}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 8.5l2 2 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Double authentification activée
              </div>
              <p className={styles.hint}>Votre compte est protégé par une application d'authentification.</p>
              <button className={styles.btnDanger} onClick={() => setShowDisable(true)}>
                Désactiver la double authentification
              </button>
            </div>
          )}

          {twoFactorEnabled && showDisable && (
            <div>
              <p className={styles.hint}>Entrez votre mot de passe pour confirmer la désactivation :</p>
              <div className={styles.field} style={{ maxWidth: 300 }}>
                <input className={styles.input} type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} placeholder="Votre mot de passe" />
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnDanger} onClick={handleDisable2FA} disabled={!disablePassword}>Confirmer la désactivation</button>
                <button className={styles.btnSecondary} onClick={() => { setShowDisable(false); setDisablePassword('') }}>Annuler</button>
              </div>
            </div>
          )}

          {!twoFactorEnabled && !qrCode && (
            <div>
              <p className={styles.hint}>
                Protégez votre compte avec une application d'authentification comme Google Authenticator, Authy ou Microsoft Authenticator. À chaque connexion, un code à 6 chiffres sera demandé en plus de votre mot de passe.
              </p>
              <button className={styles.btnPrimary} onClick={handleSetup2FA} disabled={setting2FA}>
                {setting2FA ? 'Chargement...' : 'Activer la double authentification'}
              </button>
            </div>
          )}

          {!twoFactorEnabled && qrCode && (
            <div className={styles.setup2fa}>
              <p className={styles.hint}>
                1. Ouvrez votre application d'authentification<br/>
                2. Scannez le QR code ci-dessous<br/>
                3. Entrez le code à 6 chiffres affiché dans l'application
              </p>
              <div className={styles.qrWrap}>
                <img src={qrCode} alt="QR Code 2FA" className={styles.qrImg} />
              </div>
              <p className={styles.secretCode}>
                Code manuel : <code>{secret2FA}</code>
              </p>
              <div className={styles.verifyRow}>
                <input
                  className={styles.codeInput}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                <button className={styles.btnPrimary} onClick={handleVerify2FA} disabled={verifyCode.length !== 6}>
                  Vérifier et activer
                </button>
              </div>
              <button className={styles.btnSecondary} onClick={() => { setQrCode(null); setSecret2FA(''); setSetting2FA(false) }} style={{ marginTop: 8 }}>
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
