import styles from '../runner.module.css'

export default function ConsentQuestion({ question, value, onChange, onRefuse }) {
  const acceptLabel = question.settings?.acceptLabel || "Je participe"
  const refuseLabel = question.settings?.refuseLabel || 'Je refuse de participer'

  const handleRefuse = () => {
    const confirmed = window.confirm(
      'Êtes-vous sûr(e) de vouloir refuser de participer ?\n\nVous serez redirigé(e) vers la page de fin.'
    )
    if (confirmed) {
      onChange('refuse')
      onRefuse?.()
    }
  }

  return (
    <div className={styles.consentBtns}>
      <button
        type="button"
        className={styles.consentAccept}
        data-selected={value === 'accept' ? 'true' : 'false'}
        onClick={() => onChange('accept')}
      >
        {acceptLabel}
      </button>
      <button
        type="button"
        className={styles.consentRefuse}
        data-selected={value === 'refuse' ? 'true' : 'false'}
        onClick={handleRefuse}
      >
        {refuseLabel}
      </button>
    </div>
  )
}
