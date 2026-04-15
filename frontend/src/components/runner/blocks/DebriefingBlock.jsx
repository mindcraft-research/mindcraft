import DOMPurify from 'dompurify'
import styles from '../runner.module.css'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const resolveUrl = (url) => {
  if (!url) return url
  if (url.startsWith('/uploads/')) return `${API}/api/media/files/${url.replace('/uploads/', '')}`
  if (url.startsWith('/')) return `${API}${url}`
  const fixed = url.replace(/^http:\/\/localhost:\d+/, API)
  return fixed.replace(`${API}/uploads/`, `${API}/api/media/files/`)
}

function LogoBanner({ logos, logoHeight }) {
  const valid = (logos || []).filter(Boolean)
  if (valid.length === 0) return null
  const h = logoHeight || 56
  return (
    <div className={styles.logoBanner}>
      {valid.map((url, i) => (
        <img key={i} src={resolveUrl(url)} alt="" className={styles.logoImg} style={{ maxHeight: h, maxWidth: h * 3 }} />
      ))}
    </div>
  )
}

export default function DebriefingBlock({ block, onComplete }) {
  const { title, content, redirectUrl, logos, logoHeight } = block.settings || {}

  const processedContent = typeof window !== 'undefined' && content
    ? DOMPurify.sanitize(content, { ADD_ATTR: ['style'] })
    : content

  return (
    <div className={styles.card}>
      <LogoBanner logos={logos} logoHeight={logoHeight} />
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
