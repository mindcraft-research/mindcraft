import { useMemo } from 'react'
import styles from '../runner.module.css'

export default function MatrixQuestion({ question, value = {}, onChange }) {
  const cols = question.settings?.columns || 5
  const colLabels = question.settings?.columnLabels || []
  const startFrom = question.settings?.startFrom ?? 1
  const pinHeader = !!question.settings?.pinHeader

  const items = useMemo(() => {
    if (!question.randomize) return question.matrixItems
    const arr = [...question.matrixItems]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [question.id])

  const setCell = (itemCode, colNum) => {
    onChange({ ...value, [itemCode]: String(colNum) })
  }

  // Quand l'option « En-tête de matrice toujours visible » est activée,
  // l'en-tête (numéros / ancres) reste collé sous le header du runner pendant
  // le scroll (la variable --runner-header-height évite de masquer la 1ʳᵉ ligne).
  const stickyTheadStyle = pinHeader
    ? { position: 'sticky', top: 'var(--runner-header-height, 52px)', zIndex: 5, background: 'var(--bg-card, #ffffff)', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)' }
    : undefined

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.matrixTable} style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead style={stickyTheadStyle}>
          <tr>
            <th style={{ width: '25%' }}></th>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i + startFrom}>{colLabels[i] || i + startFrom}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.label}</td>
              {Array.from({ length: cols }, (_, i) => {
                const colNum = i + startFrom
                const selected = value[item.code] === String(colNum)
                return (
                  <td key={colNum}>
                    <div
                      className={`${styles.matrixRadio} ${selected ? styles.matrixRadioSelected : ''}`}
                      onClick={() => setCell(item.code, colNum)}
                    >
                      {selected && <div className={styles.matrixRadioDot} />}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
