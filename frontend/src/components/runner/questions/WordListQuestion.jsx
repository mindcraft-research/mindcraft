import { useState, useEffect } from 'react'
import { useT } from '../../../lib/runnerStrings'

// Saisie d'une liste de mots (tâches d'évocation / représentations sociales).
// Le·la participant·e remplit `minWords` champs au minimum, et peut en ajouter
// jusqu'à `maxWords` (vide = illimité). La valeur stockée est le tableau des
// mots non vides, dans l'ordre de saisie : ["mer","bateau","poisson"]. Ce même
// tableau alimente ensuite le classement (RANKING) et le jugement (MATRIX) via
// l'option « Reprendre une réponse précédente ».
export default function WordListQuestion({ question, value, onChange }) {
  const t = useT()
  const settings = question.settings || {}
  const min = Math.max(1, Number(settings.minWords) || 1)
  const maxRaw = settings.maxWords
  const max = (maxRaw === '' || maxRaw === undefined || maxRaw === null)
    ? Infinity
    : Math.max(min, Number(maxRaw) || min)

  const [words, setWords] = useState(() => {
    const init = Array.isArray(value) ? value.slice() : []
    while (init.length < min) init.push('')
    return init
  })

  // On ne remonte que les mots non vides (données propres), dans l'ordre.
  useEffect(() => {
    onChange(words.map((w) => w.trim()).filter((w) => w !== ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  const setWord = (i, v) => setWords((prev) => prev.map((w, j) => (j === i ? v : w)))
  const addWord = () => setWords((prev) => (prev.length < max ? [...prev, ''] : prev))
  const removeWord = (i) => setWords((prev) =>
    prev.length > min ? prev.filter((_, j) => j !== i) : prev.map((w, j) => (j === i ? '' : w)))

  const canAdd = words.length < max

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {words.map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 22, textAlign: 'right', color: 'var(--gray-400, #94a3b8)', fontSize: 13 }}>{i + 1}.</span>
          <input
            className="form-input"
            type="text"
            value={w}
            onChange={(e) => setWord(i, e.target.value)}
            placeholder={settings.placeholder || t('yourWord')}
            style={{ flex: 1 }}
          />
          {words.length > min && (
            <button
              type="button"
              onClick={() => removeWord(i)}
              aria-label="Retirer ce mot"
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                color: 'var(--gray-400, #94a3b8)', fontSize: 18, lineHeight: 1, padding: '0 4px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {canAdd && (
        <button
          type="button"
          onClick={addWord}
          style={{
            alignSelf: 'flex-start', marginTop: 2, fontSize: 13, padding: '6px 12px',
            borderRadius: 8, cursor: 'pointer',
            border: '1px dashed var(--gray-300, #cbd5e1)', background: 'white',
            color: 'var(--gray-600, #475569)',
          }}
        >
          + ajouter un mot
        </button>
      )}
    </div>
  )
}
