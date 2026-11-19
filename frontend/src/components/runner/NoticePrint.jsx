import DOMPurify from 'dompurify'
import InstructionBlock from './blocks/InstructionBlock'
import styles from './runner.module.css'

// Impression de la notice d'information (lien sous le consentement et sur le
// message de fin). Tout se passe dans le navigateur : la fenêtre d'impression
// propose aussi « Enregistrer en PDF ». Les règles @media print du runner
// masquent l'en-tête, la barre de progression et les boutons.

// Lien discret « Imprimer ou enregistrer… (PDF) ».
export function PrintLink({ label }) {
  return (
    <div className={styles.consentPrintWrap}>
      <button type="button" className={styles.consentPrint} onClick={() => window.print()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" />
        </svg>
        <span>{label}</span>
      </button>
    </div>
  )
}

// Pages déjà passées, invisibles à l'écran et imprimées avant la page en
// cours : accueil et consignes (la notice y est souvent) et, si
// `withConsent`, le texte des questions de consentement. Contenu nettoyé
// comme à l'écran.
export function PrintedNotice({ blocks, withConsent = false }) {
  if (typeof window === 'undefined') return null
  return (
    <div className={styles.printOnly}>
      {blocks.map((b) => {
        if (b.type === 'WELCOME' || b.type === 'INSTRUCTION') {
          return <InstructionBlock key={`print-${b.id}`} block={b} onComplete={() => {}} />
        }
        if (!withConsent || b.type !== 'QUESTION') return null
        const consents = (b.questions || []).filter((q) => q.type === 'CONSENT' && q.text)
        if (consents.length === 0) return null
        return (
          <div key={`print-${b.id}`} className={styles.card}>
            {consents.map((q) => (
              <div key={q.id} className={styles.questionText}>
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(q.text, { ADD_ATTR: ['style'] }) }} />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
