import { useMemo } from 'react'
import styles from '../runner.module.css'

export default function MatrixQuestion({ question, value = {}, onChange }) {
  const cols = question.settings?.columns || 5
  const colLabels = question.settings?.columnLabels || []
  const startFrom = question.settings?.startFrom ?? 1
  const pinHeader = !!question.settings?.pinHeader

  // Signature des items VISIBLES (par code). Sert de dépendance au useMemo :
  // ainsi l'affichage conditionnel par item (issue #143.10) est bien pris en
  // compte quand un item apparaît/disparaît, sans re-mélanger à chaque rendu
  // (la référence du tableau matrixItems change à chaque rendu à cause du
  // piping, mais la liste des codes, elle, ne change qu'en cas de vrai
  // changement de membres).
  const itemsKey = (question.matrixItems || []).map((i) => i.code).join('|')
  const items = useMemo(() => {
    const base = question.matrixItems || []
    if (!question.randomize) return base
    const arr = [...base]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [question.id, itemsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const setCell = (itemCode, colNum) => {
    onChange({ ...value, [itemCode]: String(colNum) })
  }

  // Mode VAS (issue #143.7) : chaque item est répondu sur un curseur continu
  // partageant les mêmes bornes et labels gauche/droite. La valeur reste
  // stockée par item ({ itemCode: nombre }), comme en mode Likert.
  const isVas = question.settings?.responseMode === 'vas'
  if (isVas) {
    const vMin = Number(question.settings?.min ?? 0)
    const vMax = Number(question.settings?.max ?? 100)
    const vStep = Number(question.settings?.step ?? 1)
    const leftLabel = question.settings?.leftLabel || ''
    const rightLabel = question.settings?.rightLabel || ''
    const mid = Math.round((vMin + vMax) / 2)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {items.map((item) => {
          const answered = value[item.code] !== undefined && value[item.code] !== ''
          return (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 14, color: 'var(--gray-800)' }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {leftLabel && <span style={{ fontSize: 12, color: 'var(--gray-500)', minWidth: 70, textAlign: 'right' }}>{leftLabel}</span>}
                <input
                  type="range"
                  min={vMin}
                  max={vMax}
                  step={vStep}
                  value={answered ? value[item.code] : mid}
                  onChange={(e) => onChange({ ...value, [item.code]: String(e.target.value) })}
                  style={{ flex: 1, accentColor: 'var(--brand, #4f46e5)' }}
                />
                {rightLabel && <span style={{ fontSize: 12, color: 'var(--gray-500)', minWidth: 70 }}>{rightLabel}</span>}
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 34, textAlign: 'right', color: answered ? 'var(--navy)' : 'var(--gray-400)' }}>
                  {answered ? value[item.code] : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Quand l'option « En-tête de matrice toujours visible » est activée,
  // l'en-tête (numéros / ancres) reste collé sous le header du runner pendant
  // le scroll (la variable --runner-header-height évite de masquer la 1ʳᵉ ligne).
  const stickyTheadStyle = pinHeader
    ? { position: 'sticky', top: 'var(--runner-header-height, 52px)', zIndex: 5, background: 'var(--bg-card, #ffffff)', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)' }
    : undefined

  // Note : on n'enveloppe PAS dans un <div overflow-x: auto>. Cet enveloppement
  // ferait du wrapper un « scroll container » CSS, ce qui empêche le sticky du
  // <thead> (option « En-tête de matrice toujours visible ») de se référencer
  // à la page : il se retrouverait collé au wrapper qui défile lui aussi.
  // Conséquence acceptable : sur écran très étroit la matrice peut déborder
  // horizontalement de la page (la page elle-même devient scrollable).
  return (
    <div>
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
