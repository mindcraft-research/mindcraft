import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import api from '../lib/api'
import useAuthStore from '../lib/authStore'
import styles from './admin.module.css'

const STATUS_LABELS = {
  etudiant_l: 'Licence', etudiant_m: 'Master', doctorant: 'Doctorant·e',
  mcf: 'MCF', professeur: 'PU', chercheur: 'Chercheur·se',
  ingenieur: 'IR', postdoc: 'Post-doc', autre: 'Autre',
}
const DISCIPLINE_LABELS = {
  psycho_sociale: 'Psycho. sociale', psycho_cognitive: 'Psycho. cognitive',
  psycho_dev: 'Psycho. développement', psycho_clinique: 'Psycho. clinique',
  psycho_travail: 'Psycho. travail', neuropsycho: 'Neuropsychologie',
  neurosciences: 'Neurosciences', sciences_co: 'Sciences cognitives',
  sociologie: 'Sociologie', sciences_educ: 'Sc. éducation',
  linguistique: 'Linguistique', economie: 'Éco. comportementale',
  marketing: 'Marketing', ergonomie: 'Ergonomie',
  info_comm: 'Info-comm', autre: 'Autre',
}

const FEEDBACK_TYPE_LABELS = { BUG: 'Bug', SUGGESTION: 'Suggestion', FEATURE: 'Fonctionnalité' }
const FEEDBACK_STATUS_LABELS = { OPEN: 'Ouvert', SEEN: 'Lu', RESOLVED: 'Résolu' }

const CHART_COLORS = [
  '#4F46E5', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7', '#E11D48', '#0EA5E9', '#D97706',
]

// ─── Composant Donut Chart SVG ──────────────────────────────────────────────

function DonutChart({ data, labels, title }) {
  if (!data || data.length === 0) return null
  const total = data.reduce((s, d) => s + d[1], 0)
  if (total === 0) return null

  const size = 140, cx = 70, cy = 70, r = 52, stroke = 20
  let cumulative = 0

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.chartBody}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map(([, count], i) => {
            const pct = count / total
            const dashArray = 2 * Math.PI * r
            const dashOffset = dashArray * (1 - pct)
            const rotation = cumulative * 360 - 90
            cumulative += pct
            return (
              <circle
                key={i} cx={cx} cy={cy} r={r}
                fill="none" stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={stroke} strokeDasharray={dashArray} strokeDashoffset={dashOffset}
                transform={`rotate(${rotation} ${cx} ${cy})`}
              />
            )
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="#101828">{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#9ca3af">total</text>
        </svg>
        <div className={styles.chartLegend}>
          {data.map(([key, count], i) => (
            <div key={key} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className={styles.legendLabel}>{(labels && labels[key]) || key}</span>
              <span className={styles.legendValue}>{count} ({Math.round(count / total * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page Admin ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [fbFilter, setFbFilter] = useState('ALL')
  const [onboardingSelected, setOnboardingSelected] = useState([])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/dashboard')
  }, [user, isLoading])

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then(r => r.data),
    enabled: user?.role === 'ADMIN',
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then(r => r.data),
    enabled: user?.role === 'ADMIN',
  })

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: () => api.get('/api/feedback').then(r => r.data),
    enabled: user?.role === 'ADMIN',
  })

  const filteredFeedbacks = fbFilter === 'ALL'
    ? feedbacks
    : feedbacks.filter(f => f.type === fbFilter)

  const handleFeedbackStatus = async (id, status) => {
    try {
      await api.patch(`/api/feedback/${id}/status`, { status })
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] })
      toast.success('Statut mis à jour')
    } catch { toast.error('Erreur') }
  }

  const allUsers = usersData?.users || []
  const filteredUsers = search.trim()
    ? allUsers.filter(u => {
        const q = search.toLowerCase()
        return u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      })
    : allUsers

  const handleRoleChange = async (userId, role) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Rôle modifié')
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`/api/admin/users/${userId}/status`, { emailVerified: !currentStatus })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(currentStatus ? 'Compte suspendu' : 'Compte réactivé')
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
  }

  const handleResetOnboarding = async (userIds) => {
    const isAll = !userIds
    const label = isAll ? 'tous les utilisateurs' : `${userIds.length} utilisateur(s)`
    if (!confirm(`Réinitialiser l'onboarding pour ${label} ? Ils reverront le tour de présentation à leur prochaine connexion.`)) return
    try {
      const { data } = await api.post('/api/admin/reset-onboarding', isAll ? {} : { userIds })
      toast.success(data.message)
      setOnboardingSelected([])
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
  }

  const toggleOnboardingUser = (id) => {
    setOnboardingSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleDelete = async (userId, username) => {
    if (!confirm(`Supprimer le compte de "${username}" ? Cette action est irréversible.`)) return
    try {
      await api.delete(`/api/admin/users/${userId}`)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Utilisateur supprimé')
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
  }

  if (isLoading || !user || user.role !== 'ADMIN') return null

  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>Administration</h1>
        <p className={styles.subtitle}>Gestion des utilisateurs et statistiques de la plateforme.</p>

        {/* ── Stats cards ──────────────────────────── */}
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Utilisateurs</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.verified}</div>
              <div className={styles.statLabel}>Vérifiés</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.admins}</div>
              <div className={styles.statLabel}>Admins</div>
            </div>
          </div>
        )}

        {/* ── Graphiques ──────────────────────────── */}
        {stats && (
          <div className={styles.chartsRow}>
            <DonutChart data={stats.statuses} labels={STATUS_LABELS} title="Statuts" />
            <DonutChart data={stats.disciplines} labels={DISCIPLINE_LABELS} title="Disciplines" />
            <DonutChart data={stats.institutions} labels={{}} title="Institutions" />
          </div>
        )}

        {/* ── Users table ──────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Utilisateurs ({filteredUsers.length}{search ? ` / ${allUsers.length}` : ''})</h2>
            <div className={styles.searchWrap}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={styles.searchIcon}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou email..."
              />
              {search && (
                <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>
              )}
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>E-mail</th>
                  <th>Institution</th>
                  <th>Discipline</th>
                  <th>Statut</th>
                  <th>Rôle</th>
                  <th>Vérifié</th>
                  <th>2FA</th>
                  <th>Projets</th>
                  <th>Inscrit le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>Aucun utilisateur trouvé.</td></tr>
                )}
                {filteredUsers.map((u) => {
                  const p = typeof u.profile === 'string' ? JSON.parse(u.profile) : (u.profile || {})
                  return (
                    <tr key={u.id}>
                      <td className={styles.cellUser}>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{p.institution || '—'}</td>
                      <td>{DISCIPLINE_LABELS[p.discipline] || p.discipline || '—'}</td>
                      <td>{STATUS_LABELS[p.status] || p.status || '—'}</td>
                      <td>
                        <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className={styles.roleSelect}>
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td>{u.emailVerified ? '✓' : '✗'}</td>
                      <td>{u.twoFactorEnabled ? '✓' : '—'}</td>
                      <td>{u._count?.ownedProjects || 0}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} onClick={() => handleToggleStatus(u.id, u.emailVerified)} title={u.emailVerified ? 'Suspendre' : 'Réactiver'}>
                            {u.emailVerified ? '🔒' : '🔓'}
                          </button>
                          <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => handleDelete(u.id, u.username)} title="Supprimer">
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        {/* ── Onboarding ──────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Onboarding</h2>
            <div className={styles.onboardingActions}>
              {onboardingSelected.length > 0 && (
                <button className={styles.resetOnboardingBtn} onClick={() => handleResetOnboarding(onboardingSelected)}>
                  Relancer pour {onboardingSelected.length} sélectionné{onboardingSelected.length > 1 ? 's' : ''}
                </button>
              )}
              <button className={styles.resetOnboardingBtnAll} onClick={() => handleResetOnboarding()}>
                Relancer pour tous
              </button>
            </div>
          </div>
          <div className={styles.onboardingList}>
            {allUsers.map(u => (
              <label key={u.id} className={`${styles.onboardingItem} ${onboardingSelected.includes(u.id) ? styles.onboardingItemSelected : ''}`}>
                <input
                  type="checkbox"
                  checked={onboardingSelected.includes(u.id)}
                  onChange={() => toggleOnboardingUser(u.id)}
                  className={styles.onboardingCheck}
                />
                <span className={styles.onboardingUser}>{u.username}</span>
                <span className={styles.onboardingEmail}>{u.email}</span>
                <span className={`${styles.onboardingStatus} ${u.onboardingCompleted ? styles.onboardingDone : styles.onboardingPending}`}>
                  {u.onboardingCompleted ? 'Complété' : 'En attente'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Feedbacks ──────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Feedbacks ({filteredFeedbacks.length}{fbFilter !== 'ALL' ? ` / ${feedbacks.length}` : ''})
            </h2>
            <div className={styles.fbFilters}>
              {['ALL', 'BUG', 'SUGGESTION', 'FEATURE'].map(f => (
                <button
                  key={f}
                  className={`${styles.fbFilterBtn} ${fbFilter === f ? styles.fbFilterActive : ''}`}
                  onClick={() => setFbFilter(f)}
                >
                  {f === 'ALL' ? 'Tous' : FEEDBACK_TYPE_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className={styles.fbEmpty}>Aucun feedback pour le moment.</div>
          ) : (
            <div className={styles.fbList}>
              {filteredFeedbacks.map(fb => (
                <div key={fb.id} className={styles.fbCard}>
                  <div className={styles.fbCardHeader}>
                    <span className={`${styles.fbType} ${styles[`fbType${fb.type}`]}`}>
                      {fb.type === 'BUG' ? '🐛' : fb.type === 'SUGGESTION' ? '💡' : '✨'}{' '}
                      {FEEDBACK_TYPE_LABELS[fb.type]}
                    </span>
                    <select
                      className={styles.fbStatusSelect}
                      value={fb.status}
                      onChange={(e) => handleFeedbackStatus(fb.id, e.target.value)}
                    >
                      <option value="OPEN">Ouvert</option>
                      <option value="SEEN">Lu</option>
                      <option value="RESOLVED">Résolu</option>
                    </select>
                  </div>
                  <div className={styles.fbMessage}>{fb.message}</div>
                  <div className={styles.fbMeta}>
                    <span className={styles.fbUser}>{fb.user?.username || '—'}</span>
                    <span className={styles.fbDate}>
                      {new Date(fb.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {fb.page && <span className={styles.fbPage}>{fb.page}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
