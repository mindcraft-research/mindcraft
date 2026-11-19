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

  // Le participant garde la notice (contacts de l'équipe, droits…) :
  // la fenêtre d'impression du navigateur propose aussi « Enregistrer en PDF ».
  // Tout se passe dans le navigateur ; les règles @media print du runner
  // masquent l'en-tête et les boutons. Activé sauf si l'étude le désactive.
  const printable = question.settings?.printNotice !== false

  return (
    <>
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
      {printable && (
        <div className={styles.consentPrintWrap}>
          <button type="button" className={styles.consentPrint} onClick={() => window.print()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" />
            </svg>
            <span>{t('consentPrint')}</span>
          </button>
        </div>
      )}
    </>
  )
}
