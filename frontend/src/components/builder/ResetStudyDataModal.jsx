import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

/**
 * Modal de confirmation pour la suppression des sessions de participation
 * d'une étude (« Réinitialiser les données »).
 *
 * Comportement adaptatif selon le statut :
 *   - DRAFT, VALIDATED : confirmation simple (un seul bouton).
 *   - COLLECTING, ARCHIVED : confirmation renforcée → l'utilisateur·rice
 *     doit retaper exactement le nom de l'étude pour valider, pattern
 *     identique à la suppression d'un repo GitHub. Évite la perte
 *     accidentelle de données potentiellement réelles.
 *
 * Issue #83 relance (retour utilisateur·rice : « comment je fais pour
 * que les lignes de test n'apparaissent plus dans mon export ? »).
 */
export default function ResetStudyDataModal({ studyId, studyName, studyStatus, open, onClose, onDone }) {
  const [count, setCount] = useState(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const needsTypedConfirmation = studyStatus === 'COLLECTING' || studyStatus === 'ARCHIVED'

  useEffect(() => {
    if (!open) {
      setConfirmText('')
      setCount(null)
      return
    }
    // Récupère le nombre de sessions au moment de l'ouverture (et non
    // au chargement de la page) pour afficher une valeur à jour même si
    // de nouvelles passations sont arrivées entre temps.
    setLoadingCount(true)
    api.get(`/api/studies/${studyId}/sessions/count`)
      .then((res) => setCount(res.data.count))
      .catch((err) => {
        console.error(err)
        toast.error('Impossible de récupérer le nombre de sessions')
      })
      .finally(() => setLoadingCount(false))
  }, [open, studyId])

  if (!open) return null

  const canSubmit =
    !submitting &&
    count !== null &&
    (!needsTypedConfirmation || confirmText.trim() === (studyName || '').trim())

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await api.delete(`/api/studies/${studyId}/sessions`)
      const deleted = res.data?.deleted ?? 0
      toast.success(
        deleted === 0
          ? 'Aucune session à supprimer'
          : `${deleted} session${deleted > 1 ? 's' : ''} supprimée${deleted > 1 ? 's' : ''}`,
      )
      onDone?.(deleted)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la réinitialisation')
    } finally {
      setSubmitting(false)
    }
  }

  // Styles inline volontairement : modal isolée du module CSS du parent,
  // utilisée à plusieurs endroits (page étude + onglet Export).
  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  }
  const modalStyle = {
    background: 'white', borderRadius: 12, padding: 28, maxWidth: 540, width: '100%',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 20, color: '#b91c1c' }}>
          🧹 Réinitialiser les données de l'étude
        </h2>

        <p style={{ marginBottom: 12, color: '#374151', lineHeight: 1.55 }}>
          Cette action supprimera{' '}
          <strong>
            {loadingCount && '…'}
            {!loadingCount && count !== null && (
              count === 0 ? 'aucune session' : `${count} session${count > 1 ? 's' : ''}`
            )}
          </strong>{' '}
          de participation et toutes les réponses associées (questionnaires + stimulus).
          La structure de l'étude (blocs, questions, design) est conservée.
        </p>

        <div style={{
          padding: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#991B1B', marginBottom: 16, fontSize: 13.5,
        }}>
          ⚠️ <strong>Cette action est irréversible.</strong> Aucune sauvegarde individuelle
          n'est restaurable côté plateforme. Si vous souhaitez conserver une trace de ces
          données avant suppression, exportez-les d'abord (onglet Export).
        </div>

        {needsTypedConfirmation && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              padding: 10, borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A',
              color: '#92400E', marginBottom: 10, fontSize: 13,
            }}>
              ⚠️ Cette étude est en statut <strong>
                {studyStatus === 'COLLECTING' ? 'En collecte' : 'Archivée'}
              </strong>. Elle peut contenir des données réelles de participant·e·s.
              Pour confirmer, tapez le nom de l'étude ci-dessous.
            </div>
            <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>
              Tapez <code style={{ background: '#F3F4F6', padding: '1px 6px', borderRadius: 4 }}>{studyName}</code> pour confirmer
            </label>
            <input
              type="text"
              className="form-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={studyName}
              style={{ width: '100%', fontFamily: 'monospace' }}
              autoFocus
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </button>
          <button
            className="btn btn-danger"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={!canSubmit ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {submitting ? 'Suppression…' : 'Réinitialiser les données'}
          </button>
        </div>
      </div>
    </div>
  )
}
