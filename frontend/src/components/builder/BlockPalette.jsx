import styles from './BlockPalette.module.css'

const BLOCK_TYPES = [
  {
    type: 'WELCOME',
    label: "Message d'accueil",
    desc: "Notice d'information",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2C5.24 2 3 4.24 3 7c0 1.86 1.01 3.49 2.52 4.36L5 14h6l-.52-2.64A5 5 0 0 0 13 7c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
        <path d="M6 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    color: 'purple',
  },
  {
    type: 'QUESTION',
    label: 'Questionnaire',
    desc: 'Questions, texte, médias',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="4" cy="5" r="1.5" fill="currentColor"/>
        <rect x="7" y="4" width="7" height="2" rx="1" fill="currentColor"/>
        <circle cx="4" cy="9" r="1.5" fill="currentColor"/>
        <rect x="7" y="8" width="7" height="2" rx="1" fill="currentColor"/>
        <circle cx="4" cy="13" r="1.5" fill="currentColor"/>
        <rect x="7" y="12" width="5" height="2" rx="1" fill="currentColor"/>
      </svg>
    ),
    color: 'teal',
  },
  {
    type: 'STIMULUS',
    label: 'Tâche',
    desc: 'Conception de la tâche',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="5" cy="6" r="1.5" fill="currentColor" opacity=".5"/>
        <path d="M1 10l4-3 3 2 3-4 4 5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      </svg>
    ),
    color: 'coral',
  },
  {
    type: 'LOGIC',
    label: 'Logique',
    desc: 'Branchement conditionnel',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8h4M11 4h2M11 12h2M7 8l4-4M7 8l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    color: 'amber',
  },
  {
    type: 'DEBRIEFING',
    label: 'Message de fin',
    desc: 'Page de clôture',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M5.5 8.5l2 2 3-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: 'gray',
  },
]

export default function BlockPalette({ onAdd }) {
  return (
    <div className={styles.palette}>
      <div className={styles.title}>Blocs</div>
      <div className={styles.list}>
        {BLOCK_TYPES.map((bt) => (
          <button
            key={bt.type}
            className={styles.blockType}
            onClick={() => onAdd(bt.type)}
            title={`Ajouter un bloc ${bt.label}`}
          >
            <div className={`${styles.icon} ${styles[`icon_${bt.color}`]}`}>
              {bt.icon}
            </div>
            <div className={styles.blockInfo}>
              <span className={styles.blockLabel}>{bt.label}</span>
              <span className={styles.blockDesc}>{bt.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
