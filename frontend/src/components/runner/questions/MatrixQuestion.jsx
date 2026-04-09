import { useMemo } from 'react'
import styles from '../runner.module.css'

export default function MatrixQuestion({ question, value = {}, onChange }) {
  const cols = question.settings?.columns || 5
  const colLabels = question.settings?.columnLabels || []

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

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.matrixTable} style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '25%' }}></th>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i + 1}>{colLabels[i] || i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.label}</td>
              {Array.from({ length: cols }, (_, i) => {
                const colNum = i + 1
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
