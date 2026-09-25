import { useT } from '../../../lib/runnerStrings'
import styles from '../runner.module.css'

export default function ConsentQuestion({ question, value, onChange, onRefuse }) {
  const t = useT()
  const acceptLabel = question.settings?.acceptLabel || t('consentAccept')
  const refuseLabel = question.settings?.refuseLabel || t('consentRefuse')

  const handleRefuse = () => {
    const confirmed = window.confirm(t('consentConfirm'))
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
