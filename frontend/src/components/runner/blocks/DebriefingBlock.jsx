import styles from '../runner.module.css'

export default function DebriefingBlock({ block, onComplete }) {
  const { title, content, redirectUrl } = block.settings || {}

  return (
    <div className={styles.card}>
      <h1 className={styles.debriefTitle}>{title || 'Merci !'}</h1>
      {content && (
        <div
          className={styles.debriefContent}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
      <button className={styles.navBtn} onClick={() => onComplete(redirectUrl)}>
        Terminer
      </button>
    </div>
  )
}
