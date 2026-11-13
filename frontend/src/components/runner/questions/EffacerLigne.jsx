import { useT } from '../../../lib/runnerStrings'

// Option « Permettre d'effacer la réponse » (settings.allowClear), pour une
// question facultative. Sans elle, un choix unique peut être changé mais pas
// retiré.

// Retire une clé d'un objet de réponses par ligne. Renvoie `undefined` quand
// il ne reste rien : QuestionBlock retire alors la réponse entière, comme si
// la question n'avait jamais été répondue.
export function sansLigne(value, code) {
  const reste = { ...(value || {}) }
  delete reste[code]
  return Object.keys(reste).length > 0 ? reste : undefined
}

// Petite croix au bout d'une ligne de tableau (matrice, différentiel
// sémantique, deux échelles côte à côte). Sa place est toujours réservée :
// elle n'est visible que si la ligne a une réponse, pour que le tableau ne
// change pas de largeur.
export default function EffacerLigne({ visible, onClick }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      title={t('clearRow')}
      aria-label={t('clearRow')}
      tabIndex={visible ? 0 : -1}
      style={{
        visibility: visible ? 'visible' : 'hidden',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, fontSize: 15, lineHeight: 1, color: 'var(--gray-500, #667085)',
      }}
    >
      ×
    </button>
  )
}
