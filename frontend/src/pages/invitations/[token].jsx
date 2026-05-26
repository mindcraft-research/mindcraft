// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore from '../../lib/authStore'

const ROLE_LABELS = {
  EDITOR: 'Éditeur·rice',
  VIEWER: 'Lecteur·rice',
}

export default function InvitationPage() {
  const router = useRouter()
  const { token } = router.query
  const user = useAuthStore((s) => s.user)
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!token) return
    api.get(`/api/projects/invitations/${encodeURIComponent(token)}`)
      .then((res) => setInvitation(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Erreur lors du chargement de l\'invitation.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async () => {
    setProcessing(true)
    try {
      const res = await api.post(`/api/projects/invitations/${encodeURIComponent(token)}/accept`)
      toast.success('Invitation acceptée !')
      router.push(`/projects/${res.data.projectId}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'acceptation.')
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!confirm('Refuser cette invitation ? Vous ne pourrez plus la récupérer.')) return
    setProcessing(true)
    try {
      await api.post(`/api/projects/invitations/${encodeURIComponent(token)}/decline`)
      toast.success('Invitation refusée.')
      router.push(user ? '/dashboard' : '/auth/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du refus.')
      setProcessing(false)
    }
  }

  return (
    <>
      <Head><title>Invitation — MindCraft</title></Head>
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#4F46E5' }}>MindCraft</span>
          </div>

          {loading && (
            <p style={{ textAlign: 'center', color: '#6B7280' }}>Chargement…</p>
          )}

          {!loading && error && (
            <div style={messageStyle}>
              <h2 style={titleStyle}>Invitation introuvable</h2>
              <p style={textStyle}>{error}</p>
              <Link href="/dashboard" style={linkBtnStyle}>Retour au tableau de bord</Link>
            </div>
          )}

          {!loading && invitation && invitation.accepted && (
            <div style={messageStyle}>
              <h2 style={titleStyle}>Invitation déjà acceptée</h2>
              <p style={textStyle}>Vous faites déjà partie du projet <strong>« {invitation.project.name} »</strong>.</p>
              <Link href={`/projects/${invitation.project.id}`} style={primaryBtnStyle}>Voir le projet</Link>
            </div>
          )}

          {!loading && invitation && invitation.expired && !invitation.accepted && (
            <div style={messageStyle}>
              <h2 style={titleStyle}>Invitation expirée</h2>
              <p style={textStyle}>Cette invitation a expiré. Demandez à <strong>{invitation.senderName}</strong> de vous en renvoyer une nouvelle.</p>
            </div>
          )}

          {!loading && invitation && !invitation.accepted && !invitation.expired && (
            <>
              <h2 style={titleStyle}>Invitation à collaborer</h2>
              <p style={textStyle}>
                <strong>{invitation.senderName}</strong> vous invite à rejoindre le projet{' '}
                <strong style={{ color: '#4F46E5' }}>« {invitation.project.name} »</strong>{' '}
                en tant que <strong>{ROLE_LABELS[invitation.role] || invitation.role}</strong>.
              </p>
              <p style={{ ...textStyle, fontSize: 13, color: '#6B7280' }}>
                Invitation envoyée à <strong>{invitation.email}</strong>.
              </p>

              {/* Cas 1 : pas connecté·e ─ proposer auth selon que le compte existe */}
              {!user && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
                  {invitation.hasAccount ? (
                    <>
                      <Link
                        href={`/auth/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`}
                        style={primaryBtnStyle}
                      >
                        Se connecter pour accepter
                      </Link>
                      <button type="button" onClick={handleDecline} disabled={processing} style={secondaryBtnStyle}>
                        Refuser
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/auth/register?email=${encodeURIComponent(invitation.email)}&redirect=${encodeURIComponent(`/invitations/${token}`)}`}
                        style={primaryBtnStyle}
                      >
                        Créer un compte
                      </Link>
                      <Link
                        href={`/auth/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`}
                        style={secondaryBtnStyle}
                      >
                        J'ai déjà un compte
                      </Link>
                      <button type="button" onClick={handleDecline} disabled={processing} style={dangerBtnStyle}>
                        Refuser
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Cas 2 : connecté·e mais avec une autre adresse mail */}
              {user && user.email !== invitation.email && (
                <div style={{ ...messageStyle, marginTop: 16 }}>
                  <p style={{ ...textStyle, color: '#B91C1C' }}>
                    Cette invitation a été envoyée à <strong>{invitation.email}</strong>,
                    mais vous êtes connecté·e avec <strong>{user.email}</strong>.
                  </p>
                  <p style={textStyle}>
                    Déconnectez-vous, puis connectez-vous (ou créez un compte) avec l'adresse de l'invitation.
                  </p>
                </div>
              )}

              {/* Cas 3 : connecté·e avec la bonne adresse → Accept / Decline */}
              {user && user.email === invitation.email && (
                <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' }}>
                  <button type="button" onClick={handleDecline} disabled={processing} style={secondaryBtnStyle}>
                    Refuser
                  </button>
                  <button type="button" onClick={handleAccept} disabled={processing} style={primaryBtnStyle}>
                    {processing ? 'Acceptation…' : 'Accepter'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// Styles inline pour ne pas dépendre d'un module CSS supplémentaire
const pageStyle = {
  minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#F7F8FA', padding: 20,
}
const cardStyle = {
  background: '#fff', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%',
  boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08)',
  border: '1px solid #E5E7EB',
}
const logoStyle = { textAlign: 'center', marginBottom: 24 }
const titleStyle = { fontSize: 22, fontWeight: 600, color: '#0B1431', marginBottom: 16, textAlign: 'center' }
const textStyle = { fontSize: 14.5, color: '#374151', lineHeight: 1.6, marginBottom: 8, textAlign: 'center' }
const messageStyle = { textAlign: 'center' }

const baseBtn = {
  display: 'inline-block', padding: '12px 24px', borderRadius: 8,
  fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
  textDecoration: 'none', textAlign: 'center',
}
const primaryBtnStyle = { ...baseBtn, background: '#4F46E5', color: '#fff' }
const secondaryBtnStyle = { ...baseBtn, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }
const dangerBtnStyle = { ...baseBtn, background: 'transparent', color: '#B91C1C', border: '1px solid #FCA5A5' }
const linkBtnStyle = { ...baseBtn, background: '#F3F4F6', color: '#374151' }
