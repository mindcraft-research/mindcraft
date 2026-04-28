// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import OnboardingTour from '../components/OnboardingTour'
import useAuthStore from '../lib/authStore'
import api from '../lib/api'
import styles from './dashboard.module.css'

// Palette de couleurs "pop" déterministe par initiale de projet
const CARD_COLORS = [
  '#6366F1', // indigo vif
  '#10B981', // émeraude
  '#F59E0B', // amber
  '#EF4444', // rouge vif
  '#06B6D4', // cyan vif
  '#8B5CF6', // violet vif
  '#EC4899', // rose vif
  '#F97316', // orange vif
]
function projectColor(name) {
  return CARD_COLORS[(name?.charCodeAt(0) ?? 0) % CARD_COLORS.length]
}

// ─── CARTE PROJET ─────────────────────────────────────────────────────────────

function ProjectCard({ project, myRole, onClick }) {
  const studyCount = project._count?.studies || 0
  const collabCount = project._count?.collaborators || 0
  const isOwner = !myRole || myRole === 'OWNER'
  const color = projectColor(project.name)

  return (
    <div className={styles.projectCard} style={{ '--card-color': color }} onClick={onClick}>
      <div className={styles.cardTopBar} style={{ background: color }} />
      <div className={styles.cardBody}>
        <div className={styles.cardAvatarRow}>
          <div className={styles.cardAvatar} style={{ background: color }}>
            {project.name[0]?.toUpperCase()}
          </div>
          {!isOwner && (
            <span className="badge badge-blue">{myRole === 'EDITOR' ? 'Éditeur' : 'Lecteur'}</span>
          )}
        </div>

        <h3 className={styles.projectName}>{project.name}</h3>
        {project.description && (
          <p className={styles.projectDesc}>{project.description}</p>
        )}

        <div className={styles.projectMeta}>
          <span className={styles.metaItem}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 6h6M4 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {studyCount} étude{studyCount !== 1 ? 's' : ''}
          </span>
          <span className={styles.metaItem}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1 12c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M10 8.5c1.4.3 2.5 1.6 2.5 3.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            {collabCount + 1} membre{collabCount !== 0 ? 's' : ''}
          </span>
          <span className={styles.metaDate}>
            {new Date(project.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL NOUVEAU PROJET ─────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/projects', form)
      toast.success(`Projet "${data.project.name}" créé !`)
      onCreated(data.project)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Nouveau projet</h2>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Nom du projet *</label>
            <input
              className="form-input"
              placeholder="Ex : Attitudes envers le changement climatique"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optionnelle)</label>
            <textarea
              className="form-input"
              placeholder="Contexte, objectifs, participants visés…"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.name.trim()}>
              {loading ? 'Création…' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showNewProject, setShowNewProject] = useState(false)
  const user = useAuthStore((s) => s.user)
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding)

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/api/projects')
      return data
    },
  })

  const ownedProjects = data?.owned || []
  const sharedProjects = data?.shared || []
  const totalProjects = ownedProjects.length + sharedProjects.length

  const [dismissed2FA, setDismissed2FA] = useState(false)

  return (
    <Layout>
      {user && !user.twoFactorEnabled && !dismissed2FA && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 20px', margin: '0 0 16px',
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          position: 'relative',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>🔐</span>
          <p style={{ fontSize: 12, color: '#1e40af', margin: 0, flex: 1, lineHeight: 1.5 }}>
            <strong>Sécurisez votre compte :</strong> la double authentification (2FA) n'est pas activée.
            Nous vous recommandons de l'activer pour protéger vos données de recherche.
          </p>
          <a href="/settings" style={{
            padding: '6px 16px', background: '#4F46E5', color: '#fff', borderRadius: 6,
            fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Activer
          </a>
          <button
            onClick={() => setDismissed2FA(true)}
            style={{
              background: 'none', border: 'none', color: '#93a3bf', fontSize: 16,
              cursor: 'pointer', padding: '2px 6px', flexShrink: 0, lineHeight: 1,
            }}
            title="Fermer"
          >
            ✕
          </button>
        </div>
      )}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Mes projets</h1>
          <p className={styles.pageSubtitle}>
            {totalProjects === 0
              ? 'Créez votre premier projet pour commencer'
              : `${totalProjects} projet${totalProjects > 1 ? 's' : ''} au total`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Nouveau projet
        </button>
      </div>

      {isLoading && (
        <div className={styles.loadingWrap}>
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorBox}>Erreur lors du chargement. Vérifiez que le serveur est démarré.</div>
      )}

      {!isLoading && totalProjects === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>Aucun projet pour l'instant</h2>
          <p className={styles.emptyDesc}>
            Créez votre premier projet pour commencer à concevoir vos études expérimentales.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setShowNewProject(true)}>
            Créer mon premier projet
          </button>
        </div>
      )}

      {ownedProjects.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mes projets</h2>
          <div className={styles.projectsGrid}>
            {ownedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} myRole="OWNER" onClick={() => router.push(`/projects/${p.id}`)} />
            ))}
          </div>
        </section>
      )}

      {sharedProjects.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Partagés avec moi</h2>
          <div className={styles.projectsGrid}>
            {sharedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} myRole={p.myRole} onClick={() => router.push(`/projects/${p.id}`)} />
            ))}
          </div>
        </section>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}
        />
      )}

      {user?.onboardingCompleted === false && (
        <OnboardingTour onComplete={completeOnboarding} />
      )}
    </Layout>
  )
}
