import { useMemo } from 'react'
import styles from '../runner.module.css'

export default function SemanticDiffQuestion({ question, value = {}, onChange }) {
  // Le builder enregistre le nombre de points dans settings.points (cf.
  // BlockInspector — bloc SEMANTIC_DIFF). On lit aussi settings.columns en
  // fallback pour les éventuelles études legacy ayant l'ancienne clé.
  const cols = question.settings?.points ?? question.settings?.columns ?? 7

  const items = useMemo(() => {
    if (!question.randomize) return question.matrixItems || []
    const arr = [...(question.matrixItems || [])]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [question.id])

  const setCell = (itemCode, colNum) => {
    onChange({ ...value, [itemCode]: String(colNum) })
  }

  const startFrom = question.settings?.startFrom ?? 1
  const colNums = Array.from({ length: cols }, (_, i) => i + startFrom)
  const pinHeader = !!question.settings?.pinHeader
  const stickyTheadStyle = pinHeader
    ? { position: 'sticky', top: 'var(--runner-header-height, 52px)', zIndex: 5, background: 'var(--bg-card, #ffffff)', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)' }
    : undefined

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.matrixTable} style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead style={stickyTheadStyle}>
          <tr>
            <th style={{ width: '18%', textAlign: 'right' }}></th>
            {colNums.map((n) => (
              <th key={n}>{n}</th>
            ))}
            <th style={{ width: '18%', textAlign: 'left' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13, paddingRight: 12 }}>
                {item.left || item.label}
              </td>
              {colNums.map((n) => {
                const selected = value[item.code] === String(n)
                return (
                  <td key={n}>
                    <div
                      className={`${styles.matrixRadio} ${selected ? styles.matrixRadioSelected : ''}`}
                      onClick={() => setCell(item.code, n)}
                    >
                      {selected && <div className={styles.matrixRadioDot} />}
                    </div>
                  </td>
                )
              })}
              <td style={{ textAlign: 'left', fontWeight: 500, fontSize: 13, paddingLeft: 12 }}>
                {item.right || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
