import { useState } from 'react'
import api from '../../lib/api'
import CitationModal from '../CitationModal'
import { CITATION_DATA } from '../../lib/citation'
import styles from './ExportPanel.module.css'

export default function ExportPanel({ studyId, studyName }) {
  const [loading, setLoading] = useState(null) // 'csv' | 'csv-trials' | 'excel' | 'codebook'
  const [citationOpen, setCitationOpen] = useState(false)

  const download = async (type, filename, mime) => {
    if (loading) return
    setLoading(type)
    try {
      const res = await api.get(`/api/studies/${studyId}/export/${type}`, { responseType: 'blob' })
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
      desc: 'Résultats des tâches externes (MailBox, etc.) : un essai par ligne avec toutes les colonnes de la tâche.',
      icon: '⬛',
      ext: '.csv',
      mime: 'text/csv',
      filename: `external_${safeName}.csv`,
    },
    {
      id: 'excel',
      label: 'Export complet (Excel)',
      desc: 'Classeur Excel avec tous les onglets : Sessions, Questions, Stimulus RT, Tâches externes.',
      icon: '⬛',
      ext: '.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `export_${safeName}.xlsx`,
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

      <CitationModal
        open={citationOpen}
        onClose={() => setCitationOpen(false)}
      />
    </div>
  )
}
