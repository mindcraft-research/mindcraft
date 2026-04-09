import styles from '../runner.module.css'

export default function TextQuestion({ question, value = '', onChange }) {
  const minWords = question.settings?.minWords
  const maxWords = question.settings?.maxWords
  const multiline = question.settings?.multiline

  const wordCount = value.trim() === '' ? 0 : value.trim().split(/\s+/).length
  const tooFew = minWords && wordCount < minWords
  const tooMany = maxWords && wordCount > maxWords

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {multiline ? (
        <textarea
          className={styles.textArea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Votre réponse…"
        />
      ) : (
        <input
          className="form-input"
          style={{ fontSize: 14, padding: '12px 14px' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Votre réponse…"
        />
      )}
      {(minWords || maxWords) && (
        <div className={`${styles.wordCount} ${tooFew || tooMany ? styles.wordCountError : ''}`}>
          {wordCount} mot{wordCount !== 1 ? 's' : ''}
          {minWords && ` (min. ${minWords})`}
          {maxWords && ` (max. ${maxWords})`}
        </div>
      )}
    </div>
  )
}
