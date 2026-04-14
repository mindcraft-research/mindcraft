import DOMPurify from 'dompurify'
import styles from '../runner.module.css'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const resolveUrl = (url) => {
  if (!url) return url
  if (url.startsWith('/')) return `${API}${url}`
  return url.replace(/^http:\/\/localhost:\d+/, API)
}

function LogoBanner({ logos }) {
  const valid = (logos || []).filter(Boolean)
  if (valid.length === 0) return null
  return (
    <div className={styles.logoBanner}>
      {valid.map((url, i) => (
        <img key={i} src={resolveUrl(url)} alt="" className={styles.logoImg} />
      ))}
    </div>
  )
}

function fixEmptyParagraphs(html) {
  if (!html) return html
  return html.replace(/<p><\/p>/g, '<p><br></p>')
}

export default function DebriefingBlock({ block, onComplete }) {
  const { title, content, redirectUrl, logos } = block.settings || {}

  const processedContent = typeof window !== 'undefined' && content
    ? DOMPurify.sanitize(fixEmptyParagraphs(content), { ADD_ATTR: ['style'] })
    : content

  return (
    <div className={styles.card}>
      <LogoBanner logos={logos} />
      <h1 className={styles.debriefTitle}>{title || 'Merci !'}</h1>
      {processedContent && (
        <div
          className={styles.debriefContent}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      )}
      <button className={styles.navBtn} onClick={() => onComplete(redirectUrl)}>
        Terminer
      </button>
    </div>
  )
}
