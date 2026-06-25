import { useState, useEffect, useRef } from 'react'
// eslint-disable-next-line no-unused-vars
import DOMPurify from 'dompurify'
import styles from '../runner.module.css'

// Corrige les chemins relatifs /uploads/… et /api/media/files/… vers l'URL absolue du backend
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const mediaUrl = (url) => {
  if (!url) return url
  // Réécrire les anciennes URLs /uploads/ vers /api/media/files/
  if (url.startsWith('/uploads/')) return `${API}/api/media/files/${url.replace('/uploads/', '')}`
  if (url.startsWith('/')) return `${API}${url}`
  // Corriger les URLs avec un port obsolète (ex: 3001 → port actuel)
  const fixed = url.replace(/^http:\/\/localhost:\d+/, API)
  return fixed.replace(`${API}/uploads/`, `${API}/api/media/files/`)
}

// Image d'une question de type IMAGE, avec agrandissement au clic (lightbox).
// Le zoom n'est proposé QUE si l'image est affichée plus petite que sa taille
// réelle (sinon agrandir n'apporte rien) — utile pour les captures détaillées
// type courriels qui seraient illisibles au format réduit du questionnaire.
function ZoomableImage({ src, alt, maxWidth, caption }) {
  const [zoomed, setZoomed] = useState(false)
  const [canZoom, setCanZoom] = useState(false)
  const imgRef = useRef(null)

  const checkZoomable = () => {
    const el = imgRef.current
    if (el) setCanZoom(el.naturalWidth > el.clientWidth + 1)
  }

  // Fermeture de la vue agrandie avec la touche Échap.
  useEffect(() => {
    if (!zoomed) return
    const onKey = (e) => { if (e.key === 'Escape') setZoomed(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [zoomed])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={checkZoomable}
        onClick={canZoom ? () => setZoomed(true) : undefined}
        style={{
          // La largeur souhaitée (maxWidth) est respectée tant qu'elle tient,
          // mais `maxWidth: 100%` borne toujours l'image au conteneur — sinon
          // une grande image déborde du cadre sur les écrans plus étroits.
          width: maxWidth ? `${maxWidth}px` : '100%',
          maxWidth: '100%',
          height: 'auto',
          borderRadius: 8,
          display: 'block',
          margin: '0 auto',
          objectFit: 'contain',
          cursor: canZoom ? 'zoom-in' : 'default',
        }}
      />
      {canZoom && (
        <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>
          🔍 Cliquez sur l&apos;image pour l&apos;agrandir
        </p>
      )}
      {caption && (
        <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--gray-500)', textAlign: 'center', margin: 0 }}>
          {caption}
        </p>
      )}

      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            overflow: 'auto', padding: 24, cursor: 'zoom-out',
          }}
        >
          {/* Image à sa résolution réelle, défilable, pour lire les détails. */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 'none', width: 'auto', display: 'block', borderRadius: 4, cursor: 'default' }}
          />
          <button
            onClick={() => setZoomed(false)}
            aria-label="Fermer l'agrandissement"
            style={{
              position: 'fixed', top: 14, right: 20, fontSize: 30, lineHeight: 1,
              color: '#fff', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default function DisplayQuestion({ question, onChange: _onChange }) {
  const type = question.type || 'DISPLAY'
  const settings = question.settings || {}

  if (type === 'IMAGE') {
    return (
      <ZoomableImage
        src={mediaUrl(settings.url)}
        alt={settings.alt || ''}
        maxWidth={settings.maxWidth}
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
