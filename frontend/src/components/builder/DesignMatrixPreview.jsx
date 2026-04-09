import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { Tooltip } from './FormWidgets'
import styles from './DesignMatrixPreview.module.css'

export default function DesignMatrixPreview({ studyId, design }) {
  const { data: preview } = useQuery({
    queryKey: ['design-preview', studyId],
    queryFn: async () => {
      const { data } = await api.get(`/api/studies/${studyId}/design/preview`)
      return data
    },
    enabled: !!studyId && !!design,
    refetchInterval: 10000,
  })

  if (!design) return null

  const withinFactors = design.factors.filter((f) => f.type === 'WITHIN')
  const betweenFactors = design.factors.filter((f) => f.type === 'BETWEEN')
  const hasFactors = design.factors.length > 0
  const hasLevels = design.factors.some((f) => f.levels.length >= 2)

  if (!hasFactors || !hasLevels) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Apercu du design</span>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.emptyPreview}>
            Ajoutez au moins un facteur avec 2+ niveaux pour voir l'apercu.
          </div>
        </div>
      </div>
    )
  }

  const sequences = preview?.sequences || []
  const sessionCount = preview?.sessionCount || 0
  const isFull = preview?.isFull || false

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          Apercu du design
          <Tooltip text="Visualisation des conditions et séquences de contrebalancement." />
        </span>
        <div className={styles.statusRow}>
          <span>
            <span className={`${styles.statusDot} ${isFull ? styles.statusRed : styles.statusGreen}`} />
            {sessionCount} / {design.targetN} participants
          </span>
        </div>
      </div>
      <div className={styles.sectionBody}>

        {/* Séquences within */}
        {withinFactors.length > 0 && sequences.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
              Séquences de contrebalancement — {design.counterbalanceMethod === 'WILLIAMS' ? 'Williams' : design.counterbalanceMethod === 'RANDOM' ? 'Aléatoire' : 'Carré latin'}
            </div>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th className={styles.indexCell}>#</th>
                  {Array.from({ length: withinFactors[0]?.levels?.length || 0 }, (_, i) => (
                    <th key={i}>Position {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sequences.slice(0, 10).map((seq, i) => (
                  <tr key={i}>
                    <td className={styles.indexCell}>P{i + 1}</td>
                    {seq.map((name, j) => (
                      <td key={j}>
                        <span className={styles.seqBadge}>{name}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {sequences.length > 10 && (
              <div style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center' }}>
                … et {sequences.length - 10} autres séquences
              </div>
            )}
          </>
        )}

        {/* Cellules between */}
        {betweenFactors.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
              Cellules inter-sujet
            </div>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  {betweenFactors.map((f) => (
                    <th key={f.id}>{f.name}</th>
                  ))}
                  <th>N cible</th>
                </tr>
              </thead>
              <tbody>
                {generateBetweenCells(betweenFactors).map((cell, i) => (
                  <tr key={i}>
                    {cell.map((level, j) => (
                      <td key={j}>
                        <span className={styles.seqBadge}>{level.name}</span>
                      </td>
                    ))}
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {Math.floor(design.targetN / generateBetweenCells(betweenFactors).length)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

      </div>
    </div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateBetweenCells(betweenFactors) {
  if (betweenFactors.length === 0) return []

  const arrays = betweenFactors.map((f) => f.levels)
  return arrays.reduce(
    (acc, levels) => acc.flatMap((combo) => levels.map((level) => [...combo, level])),
    [[]]
  )
}
