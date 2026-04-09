import { useMemo } from 'react'
import styles from '../runner.module.css'

export default function SideBySideQuestion({ question, value = {}, onChange }) {
  const cols = question.settings?.columns || 5
  const leftLabel = question.settings?.leftLabel || 'Condition A'
  const rightLabel = question.settings?.rightLabel || 'Condition B'

  const items = useMemo(() => {
    if (!question.randomize) return question.matrixItems
    const arr = [...question.matrixItems]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [question.id])

  const setCell = (itemCode, side, colNum) => {
    const prev = value[itemCode] || {}
    onChange({ ...value, [itemCode]: { ...prev, [side]: String(colNum) } })
  }

  const colNums = Array.from({ length: cols }, (_, i) => i + 1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.matrixTable}>
        <thead>
          <tr>
            {/* Item label column */}
            <th style={{ minWidth: 160 }}></th>

            {/* Left condition header */}
            <th
              colSpan={cols}
              style={{
                textAlign: 'center',
                borderBottom: '2px solid var(--gray-200)',
                color: 'var(--navy)',
                fontWeight: 600,
                fontSize: 13,
                paddingBottom: 6,
              }}
            >
              {leftLabel}
            </th>

            {/* Separator column */}
            <th
              style={{
                width: 16,
                borderLeft: '2px solid var(--gray-300)',
                borderRight: '2px solid var(--gray-300)',
                padding: 0,
              }}
            />

            {/* Right condition header */}
            <th
              colSpan={cols}
              style={{
                textAlign: 'center',
                borderBottom: '2px solid var(--gray-200)',
                color: 'var(--navy)',
                fontWeight: 600,
                fontSize: 13,
                paddingBottom: 6,
              }}
            >
              {rightLabel}
            </th>
          </tr>

          {/* Scale number row */}
          <tr>
            <th></th>
            {colNums.map((n) => (
              <th key={`left-h-${n}`}>{n}</th>
            ))}
            <th
              style={{
                borderLeft: '2px solid var(--gray-300)',
                borderRight: '2px solid var(--gray-300)',
                padding: 0,
              }}
            />
            {colNums.map((n) => (
              <th key={`right-h-${n}`}>{n}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const itemVal = value[item.code] || {}
            return (
              <tr key={item.id}>
                <td>{item.label}</td>

                {/* Left radio buttons */}
                {colNums.map((n) => {
                  const selected = itemVal.left === String(n)
                  return (
                    <td key={`left-${n}`}>
                      <div
                        className={`${styles.matrixRadio} ${selected ? styles.matrixRadioSelected : ''}`}
                        onClick={() => setCell(item.code, 'left', n)}
                      >
                        {selected && <div className={styles.matrixRadioDot} />}
                      </div>
                    </td>
                  )
                })}

                {/* Separator cell */}
                <td
                  style={{
                    borderLeft: '2px solid var(--gray-300)',
                    borderRight: '2px solid var(--gray-300)',
                    padding: 0,
                    width: 16,
                  }}
                />

                {/* Right radio buttons */}
                {colNums.map((n) => {
                  const selected = itemVal.right === String(n)
                  return (
                    <td key={`right-${n}`}>
                      <div
                        className={`${styles.matrixRadio} ${selected ? styles.matrixRadioSelected : ''}`}
                        onClick={() => setCell(item.code, 'right', n)}
                      >
                        {selected && <div className={styles.matrixRadioDot} />}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
