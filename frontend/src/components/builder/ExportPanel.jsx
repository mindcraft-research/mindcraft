import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import CitationModal from '../CitationModal'
import ResetStudyDataModal from './ResetStudyDataModal'
import { CITATION_DATA } from '../../lib/citation'
import styles from './ExportPanel.module.css'

export default function ExportPanel({ studyId, studyName, studyStatus }) {
  const queryClient = useQueryClient()
  const [resetOpen, setResetOpen] = useState(false)
  const [loading, setLoading] = useState(null) // 'csv' | 'csv-trials' | 'excel' | 'codebook'
  const [citationOpen, setCitationOpen] = useState(false)
  // Inclure l'heure d'arrivée sur chaque bloc (1 colonne par bloc). Utile
  // pour détecter les passations bâclées (temps anormalement court par page).
  // Décoché par défaut : la majorité des analyses se basent sur le temps
  // total (déjà fourni dans les colonnes start/end/duration).
  const [includePageTimings, setIncludePageTimings] = useState(false)

  const download = async (type, filename, mime) => {
    if (loading) return
    setLoading(type)
    try {
      // L'option « temps par page » ne s'applique qu'au CSV Questionnaire
      const params = (type === 'csv' && includePageTimings) ? '?pageTimings=1' : ''
      const res = await api.get(`/api/studies/${studyId}/export/${type}${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const safeName = studyName?.replace(/[^\w]/g, '_') || studyId

  const exports = [
    {
      id: 'csv',
      label: 'Réponses questionnaires (CSV)',
      desc: 'Format large : un participant par ligne, une colonne par code de question. Inclut les conditions expérimentales.',
      icon: '⬛',
      ext: '.csv',
      mime: 'text/csv',
      filename: `questions_${safeName}.csv`,
    },
    {
      id: 'csv-trials',
      label: 'Temps de réaction stimulus (CSV)',
      desc: 'Un essai par ligne : fichier stimulus, touche, TR (ms), correct. Inclut les conditions.',
      icon: '⬛',
      ext: '.csv',
      mime: 'text/csv',
      filename: `trials_${safeName}.csv`,
    },
    {
      id: 'csv-external',
      label: 'Tâches externes (CSV)',
      desc: 'Résultats des tâches externes embarquées : un essai par ligne avec toutes les colonnes spécifiques de la tâche.',
      icon: '⬛',
      ext: '.csv',
      mime: 'text/csv',
      filename: `external_${safeName}.csv`,
    },
    {
      id: 'excel',
      label: 'Export complet (Excel)',
      desc: 'Classeur Excel avec tous les onglets : Sessions, Questions, Stimulus RT, Tâches externes. Format Microsoft (.xlsx).',
      icon: '⬛',
      ext: '.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `export_${safeName}.xlsx`,
    },
    {
      id: 'ods',
      label: 'Export complet (Tableur ouvert)',
      desc: 'Mêmes données que l\'export Excel, au format ouvert OpenDocument (.ods, ISO 26300). Compatible LibreOffice, OnlyOffice, Excel récent.',
      icon: '⬛',
      ext: '.ods',
      mime: 'application/vnd.oasis.opendocument.spreadsheet',
      filename: `export_${safeName}.ods`,
    },
    {
      id: 'codebook',
      label: 'Codebook (PDF)',
      desc: 'Documentation de toutes les variables : codes, libellés, échelles, modalités, design.',
      icon: '⬛',
      ext: '.pdf',
      mime: 'application/pdf',
      filename: `codebook_${safeName}.pdf`,
    },
    {
      id: 'json',
      label: "Structure de l'étude (JSON)",
      desc: "Sauvegarde complète du design (blocs, questions, séquences, métadonnées Open Science). Aucune donnée participant. Réimportable sur une autre instance MindCraft, ou réutilisable pour migrer vers une autre plateforme.",
      icon: '⬛',
      ext: '.json',
      mime: 'application/json',
      filename: `mindcraft_structure_${safeName}.json`,
    },
  ]

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <h2 className={styles.title}>Export des données</h2>
        <p className={styles.subtitle}>
          Téléchargez les données collectées dans plusieurs formats, ainsi que la structure
          complète de l'étude (JSON). Les colonnes de conditions expérimentales sont
          automatiquement incluses dans les exports tabulaires.
        </p>
      </div>

      <div className={styles.grid}>
        {exports.map((e) => (
          <div key={e.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardExt}>{e.ext.toUpperCase()}</span>
              <span className={styles.cardLabel}>{e.label}</span>
            </div>
            <p className={styles.cardDesc}>{e.desc}</p>

            {/* Option exclusive au CSV Questionnaire : inclure une colonne
                par bloc avec l'heure d'arrivée. */}
            {e.id === 'csv' && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: 'var(--gray-600)', marginTop: 4, marginBottom: 8, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={includePageTimings}
                  onChange={(ev) => setIncludePageTimings(ev.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>
                  Inclure le temps par page
                  <span style={{ marginLeft: 6, color: 'var(--gray-400)' }} title="Ajoute une colonne par bloc avec l'heure d'arrivée. Utile pour détecter les passations bâclées (temps anormalement court par page).">
                    ⓘ
                  </span>
                </span>
              </label>
            )}

            <button
              className={`btn btn-primary btn-sm ${styles.dlBtn}`}
              onClick={() => download(e.id, e.filename, e.mime)}
              disabled={loading === e.id}
            >
              {loading === e.id ? 'Génération…' : 'Télécharger'}
            </button>
          </div>
        ))}
      </div>

      <div className={styles.citeBanner}>
        <div className={styles.citeBannerText}>
          <h3 className={styles.citeBannerTitle}>
            📚 Pensez à citer MindCraft
          </h3>
          <p className={styles.citeBannerDesc}>
            Si vous publiez ou partagez les données collectées avec
            MindCraft, merci de citer la plateforme dans vos articles,
            mémoires ou rapports. Citation disponible aux formats APA,
            BibTeX et RIS — version <code>{CITATION_DATA.version}</code>,
            DOI{' '}
            <a
              href={CITATION_DATA.doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.citeBannerLink}
            >
              {CITATION_DATA.doi}
            </a>.
          </p>
        </div>
        <button
          type="button"
          className={`btn btn-primary btn-sm ${styles.citeBannerBtn}`}
          onClick={() => setCitationOpen(true)}
        >
          Obtenir la citation
        </button>
      </div>

      {/* Zone de réinitialisation des données. Volontairement placée en bas
          de l'onglet Export car c'est là que l'utilisateur·rice voit ses
          données suspectes (sessions de test parasites avant la vraie
          collecte, doublons, etc.). Issue #83 relance. */}
      <div style={{
        marginTop: 32, padding: 20, border: '1px solid #FECACA',
        borderRadius: 12, background: '#FEF2F2',
      }}>
        <h3 style={{ margin: 0, marginBottom: 6, fontSize: 16, color: '#991B1B' }}>
          🧹 Réinitialiser les données collectées
        </h3>
        <p style={{ margin: 0, marginBottom: 12, fontSize: 13.5, color: '#7F1D1D', lineHeight: 1.55 }}>
          Supprime toutes les sessions de participation et leurs réponses pour cette
          étude. La structure (blocs, questions, design) est conservée. Utile pour
          repartir d'une base propre après une phase de tests, avant le lancement de
          la vraie collecte. Action <strong>irréversible</strong>.
        </p>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setResetOpen(true)}
        >
          Réinitialiser les données…
        </button>
      </div>

      <CitationModal
        open={citationOpen}
        onClose={() => setCitationOpen(false)}
      />

      <ResetStudyDataModal
        studyId={studyId}
        studyName={studyName}
        studyStatus={studyStatus}
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onDone={() => {
          // Invalide les caches susceptibles d'afficher le nombre de sessions
          // ou les données collectées (page étude, dashboard projet, etc.).
          queryClient.invalidateQueries({ queryKey: ['study', studyId] })
        }}
      />
    </div>
  )
}
