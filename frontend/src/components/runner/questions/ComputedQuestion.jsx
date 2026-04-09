import { useState, useEffect } from 'react'
import styles from '../runner.module.css'

function evalFormula(formula, values) {
  try {
    const keys = Object.keys(values)
    const vals = keys.map((k) => values[k])
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `return (${formula})`)
    const result = fn(...vals)
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return null
    return result
  } catch {
    return null
  }
}

export default function ComputedQuestion({ question, value = {}, onChange }) {
  const settings = question.settings || {}
  const variables = settings.variables || []
  const formula = settings.formula || ''
  const resultLabel = settings.resultLabel || 'Résultat'
  const resultUnit = settings.resultUnit || ''
  const decimals = settings.decimals ?? 2
  const showResult = settings.showResult !== false

  const [inputs, setInputs] = useState(() => {
    const init = {}
    variables.forEach((v) => { init[v.code] = value[v.code] ?? '' })
    return init
  })

  const allFilled = variables.every((v) => inputs[v.code] !== '' && inputs[v.code] !== undefined)
  const numericInputs = {}
  variables.forEach((v) => { numericInputs[v.code] = parseFloat(inputs[v.code]) })
  const result = allFilled && formula ? evalFormula(formula, numericInputs) : null

  useEffect(() => {
    const newVal = { ...inputs }
    if (result !== null) newVal._result = result
    onChange(newVal)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(inputs)])

  const handleChange = (code, raw) => {
    setInputs((prev) => ({ ...prev, [code]: raw }))
  }

  return (
    <div className={styles.computedWrap}>
      <div className={styles.computedFields}>
        {variables.map((v) => (
          <div key={v.code} className={styles.computedField}>
            <label className={styles.computedFieldLabel}>
              {v.label || v.code}
              {v.unit && <span className={styles.computedFieldUnit}>{v.unit}</span>}
            </label>
            <input
              type="number"
              className={styles.computedInput}
              value={inputs[v.code] ?? ''}
              min={v.min}
              max={v.max}
              step="any"
              placeholder="—"
              onChange={(e) => handleChange(v.code, e.target.value)}
            />
          </div>
        ))}
      </div>

      {showResult && (
        <div className={result !== null ? styles.computedResult : styles.computedResultEmpty}>
          <span className={styles.computedResultLabel}>{resultLabel}</span>
          <span className={styles.computedResultValue}>
            {result !== null
              ? `${result.toFixed(decimals)}${resultUnit ? ' ' + resultUnit : ''}`
              : '—'}
          </span>
        </div>
      )}
    </div>
  )
}
