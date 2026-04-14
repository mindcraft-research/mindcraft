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
        <img key={i} src={resolveUrl(url)} alt="" className={styles.logoImg} onError={(e) => { e.target.style.display = 'none' }} />
      ))}
    </div>
  )
}

function autoLinkEmails(html) {
  if (!html) return html
  // Convertir les emails en texte brut (pas déjà dans un <a>) en liens cliquables
  return html.replace(
    /(?<![">])([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})(?![^<]*<\/a>)/g,
    '<a href="mailto:$1" style="color:var(--brand);text-decoration:underline">$1</a>'
  )
}

export default function InstructionBlock({ block, onComplete }) {
  const { title, content, buttonLabel, logos } = block.settings || {}

  const processedContent = typeof window !== 'undefined'
    ? DOMPurify.sanitize(autoLinkEmails(content || ''), { ADD_ATTR: ['style'] })
    : content

  return (
    <div className={styles.card}>
      <LogoBanner logos={logos} />
      {title && <h1 className={styles.instrTitle}>{title}</h1>}
      {processedContent && (
        <div
          className={styles.instrContent}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      )}
      <button className={styles.navBtn} onClick={onComplete}>
        {buttonLabel || 'Continuer'}
      </button>
    </div>
  )
}
