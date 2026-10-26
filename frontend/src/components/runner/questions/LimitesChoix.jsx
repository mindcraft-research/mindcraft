// Nombre de réponses minimum / maximum d'une question à cases à cocher
// (settings.minChoices / settings.maxChoices, facultatifs). Utilisé par les
// cases à cocher (simples, avec médias, avec commentaire) et par la
// validation du bloc (QuestionBlock).
import { useT } from '../../../lib/runnerStrings'
import styles from '../runner.module.css'

// Entiers ≥ 1 seulement ; un maximum inférieur au minimum est ignoré.
export function limitesChoix(settings) {
  const n = (v) => { const x = Number(v); return v !== '' && v != null && Number.isInteger(x) && x >= 1 ? x : null }
  const min = n(settings?.minChoices)
  let max = n(settings?.maxChoices)
  if (min && max && max < min) max = null
  return { min, max }
}

// Nombre de cases cochées, selon le type de question.
export function nbCoches(type, value) {
  if (type === 'CHECKBOX_COMMENT') return Array.isArray(value?.choices) ? value.choices.length : 0
  return Array.isArray(value) ? value.length : 0
}

// Indication affichée au-dessus des choix (rien sans limite).
export function IndicationChoix({ settings }) {
  const t = useT()
  const { min, max } = limitesChoix(settings)
  if (!min && !max) return null
  return <p className={styles.choiceHint}>{t('choicesHint', min, max)}</p>
}
