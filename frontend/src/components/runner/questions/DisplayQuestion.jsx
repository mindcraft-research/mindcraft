// eslint-disable-next-line no-unused-vars
import DOMPurify from 'dompurify'
import styles from '../runner.module.css'

// Corrige les chemins relatifs /uploads/… vers l'URL absolue du backend
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const mediaUrl = (url) => {
  if (!url) return url
  if (url.startsWith('/')) return `${API}${url}`
  // Corriger les URLs avec un port obsolète (ex: 3001 → port actuel)
  return url.replace(/^http:\/\/localhost:\d+/, API)
}

export default function DisplayQuestion({ question, onChange: _onChange }) {
  const type = question.type || 'DISPLAY'
  const settings = question.settings || {}

  if (type === 'IMAGE') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <img
          src={mediaUrl(settings.url)}
          alt={settings.alt || ''}
          style={{
            maxWidth: '100%',
            maxHeight: 400,
            borderRadius: 8,
            display: 'block',
            margin: '0 auto',
            objectFit: 'contain',
          }}
        />
        {settings.caption && (
          <p
            style={{
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--gray-500)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {settings.caption}
          </p>
        )}
      </div>
    )
  }

  if (type === 'AUDIO') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {question.text && (
          <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6, margin: 0 }}>
            {question.text}
          </p>
        )}
        <audio
          src={mediaUrl(settings.url)}
          controls
          autoPlay={!!settings.autoPlay}
          loop={!!settings.loop}
          style={{ width: '100%' }}
        />
      </div>
    )
  }

  if (type === 'VIDEO') {
    const url = mediaUrl(settings.url) || ''
    // Detect YouTube URLs and extract video ID
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {question.text && (
          <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6, margin: 0 }}>
            {question.text}
          </p>
        )}
        {ytMatch ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}`}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: '100%',
              maxWidth: 720,
              aspectRatio: '16/9',
              border: 'none',
              borderRadius: 8,
              display: 'block',
              margin: '0 auto',
            }}
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay={!!settings.autoPlay}
            style={{
              maxWidth: '100%',
              maxHeight: 400,
              borderRadius: 8,
              display: 'block',
              margin: '0 auto',
            }}
          />
        )}
      </div>
    )
  }

  // Default: DISPLAY (rich HTML text)
  return (
    <div
      className={styles.displayHtml}
      dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(question.text || '') : (question.text || '') }}
    />
  )
}
