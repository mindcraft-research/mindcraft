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
    const image = (
      <ZoomableImage
        src={mediaUrl(settings.url)}
        alt={settings.alt || ''}
        size={settings.imageSize}
        maxWidth={settings.maxWidth}
        zoom={settings.zoom !== false}
        caption={settings.caption}
      />
    )
    // Texte à côté de l'image (settings.sideText). Sans texte : l'image
    // seule, comme avant. Les deux colonnes passent l'une sous l'autre quand
    // l'écran est trop étroit (flex-wrap), sauf si le chercheur a choisi de
    // les garder côte à côte (settings.keepSideBySide) : chacun prend alors
    // la moitié de la largeur, même sur téléphone.
    const texte = String(settings.sideText || '')
    if (texte.replace(/<[^>]+>/g, '').trim() === '') return image
    const cote = !!settings.keepSideBySide
    const html = typeof window !== 'undefined' ? DOMPurify.sanitize(texte, { ADD_ATTR: ['style'] }) : texte
    return (
      <div style={{ display: 'flex', flexWrap: cote ? 'nowrap' : 'wrap', alignItems: 'center', gap: cote ? 'clamp(10px, 3vw, 24px)' : 24, flexDirection: settings.textPosition === 'left' ? 'row-reverse' : 'row' }}>
        <div style={{ flex: cote ? '1 1 0' : '1 1 280px', minWidth: 0 }}>{image}</div>
        <div
          style={{ flex: cote ? '1 1 0' : '1 1 280px', minWidth: 0, fontSize: cote ? 'clamp(13px, 3.4vw, 15px)' : 15, lineHeight: 1.6, color: 'var(--gray-800)', overflowWrap: 'anywhere' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
      dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(question.text || '', { ADD_ATTR: ['style'] }) : (question.text || '') }}
    />
  )
}
