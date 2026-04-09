import styles from '../runner.module.css'

export default function InstructionBlock({ block, onComplete }) {
  const { title, content, buttonLabel } = block.settings || {}

  return (
    <div className={styles.card}>
      {title && <h1 className={styles.instrTitle}>{title}</h1>}
      {content && (
        <div
          className={styles.instrContent}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
      <button className={styles.navBtn} onClick={onComplete}>
        {buttonLabel || 'Continuer'}
      </button>
    </div>
  )
}
