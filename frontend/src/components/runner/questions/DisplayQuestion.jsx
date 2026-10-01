// eslint-disable-next-line no-unused-vars
import DOMPurify from 'dompurify'
import styles from '../runner.module.css'
import { mediaUrl, ZoomableImage } from './mediaShared'

export default function DisplayQuestion({ question, onChange: _onChange }) {
  const type = question.type || 'DISPLAY'
  const settings = question.settings || {}

  if (type === 'IMAGE') {
    // Zoom : actif sauf s'il a été désactivé (`zoom: false`). Les questions
    // créées avant l'option n'ont pas ce réglage et gardent donc le zoom ; les
    // nouvelles sont créées avec `zoom: false` (voir BlockInspector).
    return (
      <ZoomableImage
        src={mediaUrl(settings.url)}
        alt={settings.alt || ''}
        size={settings.imageSize}
        maxWidth={settings.maxWidth}
        zoom={settings.zoom !== false}
        caption={settings.caption}
      />
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
      dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(question.text || '', { ADD_ATTR: ['style'] }) : (question.text || '') }}
    />
  )
}
