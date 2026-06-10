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
  const [discipline, setDiscipline] = useState('')
  const [statusOther, setStatusOther] = useState('')
  const [disciplineOther, setDisciplineOther] = useState('')
  const [institutionSaving, setInstitutionSaving] = useState(false)

  // Account deletion
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

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
      setDiscipline(p.discipline || '')
      setStatusOther(p.statusOther || '')
      setDisciplineOther(p.disciplineOther || '')
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
      const { data } = await api.post('/api/auth/2fa/setup', {})
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
          <p style={{ fontSize: 12, color: 'var(--gray-400)', margin: '0 0 14px', lineHeight: 1.6 }}>
            Ces informations sont <strong style={{ color: 'var(--gray-500)' }}>optionnelles</strong>. Elles nous permettent d'avoir des statistiques anonymisées sur l'utilisation de la plateforme (types d'établissements, disciplines, profils d'utilisateurs) afin d'améliorer MindCraft.
          </p>
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
                {status === 'autre' && (
                  <input className={styles.input} value={statusOther} onChange={(e) => setStatusOther(e.target.value)} placeholder="Précisez votre statut..." style={{ marginTop: 6 }} />
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Discipline</label>
                <select className={styles.input} value={discipline} onChange={(e) => setDiscipline(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  <option value="psycho_sociale">Psychologie sociale</option>
                  <option value="psycho_cognitive">Psychologie cognitive</option>
                  <option value="psycho_dev">Psychologie du développement</option>
                  <option value="psycho_clinique">Psychologie clinique</option>
                  <option value="psycho_travail">Psychologie du travail</option>
                  <option value="neuropsycho">Neuropsychologie</option>
                  <option value="neurosciences">Neurosciences</option>
                  <option value="sciences_co">Sciences cognitives</option>
                  <option value="sociologie">Sociologie</option>
                  <option value="sciences_educ">Sciences de l'éducation</option>
                  <option value="linguistique">Linguistique</option>
                  <option value="economie">Économie comportementale</option>
                  <option value="marketing">Marketing</option>
                  <option value="ergonomie">Ergonomie</option>
                  <option value="info_comm">Sciences de l'information et communication</option>
                  <option value="autre">Autre</option>
                </select>
                {discipline === 'autre' && (
                  <input className={styles.input} value={disciplineOther} onChange={(e) => setDisciplineOther(e.target.value)} placeholder="Précisez votre discipline..." style={{ marginTop: 6 }} />
                )}
              </div>
            </div>
          </div>
          <button className={styles.btnPrimary} onClick={async () => {
            setInstitutionSaving(true)
            try {
              const profile = {
                institution, laboratory, status, discipline,
                ...(status === 'autre' ? { statusOther } : {}),
                ...(discipline === 'autre' ? { disciplineOther } : {}),
              }
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
              <div style={{ padding: '14px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#1e40af', fontWeight: 600, margin: '0 0 6px' }}>
                  🔐 Pourquoi activer la double authentification ?
                </p>
                <p style={{ fontSize: 12, color: '#1e3a5f', lineHeight: 1.6, margin: '0 0 8px' }}>
                  La double authentification (2FA) ajoute une couche de sécurité supplémentaire à votre compte. Même si votre mot de passe est compromis, personne ne pourra accéder à votre compte sans le code généré par votre application.
                </p>
                <p style={{ fontSize: 12, color: '#1e3a5f', lineHeight: 1.6, margin: '0 0 8px' }}>
                  <strong>Prérequis :</strong> vous devez installer une application d'authentification sur votre téléphone. Voici les plus courantes (gratuites) :
                </p>
                <ul style={{ fontSize: 12, color: '#1e3a5f', lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
                  <li><strong>Google Authenticator</strong> — <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>Android</a> / <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>iPhone</a></li>
                  <li><strong>Microsoft Authenticator</strong> — <a href="https://play.google.com/store/apps/details?id=com.azure.authenticator" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>Android</a> / <a href="https://apps.apple.com/app/microsoft-authenticator/id983156458" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>iPhone</a></li>
                  <li><strong>Authy</strong> — <a href="https://authy.com/download/" target="_blank" rel="noreferrer" style={{ color: '#4F46E5' }}>Toutes plateformes</a></li>
                </ul>
              </div>
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

        {/* ── MES DROITS RGPD ────────────────────────────────────────────
          Nouvelle section dédiée qui rend visibles les 4 droits RGPD
          dont disposent les utilisateur·rice·s sur leurs données :
          accès (RGPD Art. 15), rectification (Art. 16), portabilité
          (Art. 20) et effacement (Art. 17). Les droits d'accès et de
          rectification sont assurés par les sections au-dessus (Profil,
          Informations institutionnelles, Mot de passe, 2FA). La
          portabilité est assurée ici par le bouton d'export. L'effacement
          est géré dans la section « Suppression du compte » ci-dessous.
          Avant cette refonte, l'export RGPD se trouvait dans la « Zone
          danger », ce qui était sémantiquement bizarre (exporter ses
          données n'est pas dangereux).
        ──────────────────────────────────────────────────────────────── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Mes droits RGPD</h2>
          <p className={styles.hint} style={{ marginBottom: 14 }}>
            Conformément au Règlement Général sur la Protection des Données (Union européenne, 2016), vous disposez sur vos données personnelles des droits suivants. Ces droits sont implémentés directement dans cette page :
          </p>
          <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, margin: '0 0 18px', paddingLeft: 20 }}>
            <li><strong>Droit d'accès</strong> (Art. 15) — l'ensemble de vos données est visible dans les sections « Profil » et « Informations institutionnelles » ci-dessus.</li>
            <li><strong>Droit de rectification</strong> (Art. 16) — toutes vos données sont modifiables directement dans les champs des sections au-dessus.</li>
            <li><strong>Droit à la portabilité</strong> (Art. 20) — vous pouvez télécharger l'intégralité de vos données dans un format ouvert (JSON), via le bouton ci-dessous.</li>
            <li><strong>Droit à l'effacement</strong> (Art. 17) — vous pouvez supprimer définitivement votre compte et toutes vos données depuis la section « Suppression du compte » ci-dessous.</li>
          </ul>
          <button className={styles.btnSecondary} onClick={async () => {
            try {
              const { data } = await api.get('/api/auth/data-export', { responseType: 'blob' })
              const url = window.URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)]))
              const a = document.createElement('a')
              a.href = url
              a.download = 'mindcraft-data-export.json'
              a.click()
              toast.success('Données exportées')
            } catch { toast.error('Erreur lors de l\'export') }
          }}>
            Exporter mes données (RGPD Art. 20)
          </button>
        </div>

        {/* ── SUPPRESSION DU COMPTE ──────────────────────────────────────
          Anciennement « Zone danger ». Recentrée sur la seule action
          irréversible : la suppression définitive du compte. Mention
          explicite du RGPD Art. 17 (droit à l'effacement).
        ──────────────────────────────────────────────────────────────── */}
        <div className={styles.card} style={{ borderColor: '#fecaca' }}>
          <h2 className={styles.cardTitle} style={{ color: '#b91c1c' }}>Suppression du compte</h2>
          <p className={styles.hint} style={{ marginBottom: 14 }}>
            Vous pouvez supprimer définitivement votre compte à tout moment. Cette action est <strong>irréversible</strong> : toutes vos données, projets et études seront définitivement effacés.
          </p>
          {!showDeleteAccount ? (
            <button className={styles.btnDanger} onClick={() => setShowDeleteAccount(true)}>
              Supprimer mon compte
            </button>
          ) : (
            <div>
              <div className={styles.field} style={{ maxWidth: 300, marginBottom: 8 }}>
                <label className={styles.label}>Confirmez avec votre mot de passe :</label>
                <input className={styles.input} type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Votre mot de passe" />
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btnDanger} disabled={!deletePassword} onClick={async () => {
                  try {
                    await api.post('/api/auth/delete-account', { password: deletePassword })
                    localStorage.removeItem('accessToken')
                    window.location.href = '/auth/login'
                  } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
                }}>
                  Confirmer la suppression définitive
                </button>
                <button className={styles.btnSecondary} onClick={() => { setShowDeleteAccount(false); setDeletePassword('') }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
