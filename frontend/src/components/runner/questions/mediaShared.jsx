// Éléments partagés par les questions qui affichent des images :
// IMAGE (DisplayQuestion), MEDIA_RADIO et MEDIA_CHECKBOX.
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../../../lib/runnerStrings'

// Corrige les chemins relatifs /uploads/… et /api/media/files/… vers l'URL absolue du backend
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
export const mediaUrl = (url) => {
  if (!url) return url
  // Réécrire les anciennes URLs /uploads/ vers /api/media/files/
  if (url.startsWith('/uploads/')) return `${API}/api/media/files/${url.replace('/uploads/', '')}`
  if (url.startsWith('/')) return `${API}${url}`
  // Corriger les URLs avec un port obsolète (ex: 3001 → port actuel)
  const fixed = url.replace(/^http:\/\/localhost:\d+/, API)
  return fixed.replace(`${API}/uploads/`, `${API}/api/media/files/`)
}

// Tailles proposées dans le builder (réglage `settings.imageSize`).
// Question IMAGE : une seule image, on règle sa LARGEUR.
//   Sans réglage (questions existantes) : maxWidth en px si renseigné, sinon pleine largeur.
export const IMAGE_WIDTHS = { small: 320, medium: 560, large: 800 }
// Choix avec médias : plusieurs images alignées, on règle leur HAUTEUR max.
//   Sans réglage (questions existantes) : moyenne = 200 px, l'ancien comportement.
export const CHOICE_IMAGE_HEIGHTS = { small: 120, medium: 200, large: 360 }

// L'image est-elle affichée plus petite que sa taille réelle ? (sinon agrandir
// n'apporte rien et on ne propose pas le zoom)
function estReduite(el) {
  return !!el && (el.naturalWidth > el.clientWidth + 1 || el.naturalHeight > el.clientHeight + 1)
}

// Vue agrandie : image à sa résolution réelle, défilable, fermée par clic,
// bouton × ou Échap. Rendue dans <body> (portail) pour ne pas être rognée par
// la carte de la question. Les clics ne remontent PAS au parent React : dans
// une question à choix, fermer l'agrandissement ne doit pas cocher le choix.
export function ImageLightbox({ src, alt, onClose }) {
  const t = useT()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      onClick={(e) => { e.stopPropagation(); onClose() }}
      style={{
        // Au-dessus de tout, y compris le menu global flottant (z 9999, panneau 99999).
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflow: 'auto', padding: 24, cursor: 'zoom-out',
      }}
    >
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 'none', width: 'auto', display: 'block', borderRadius: 4, cursor: 'default' }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label={t('zoomClose')}
        style={{
          position: 'fixed', top: 14, right: 20, fontSize: 30, lineHeight: 1,
          color: '#fff', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>,
    document.body
  )
}

// Image d'une question de type IMAGE. Agrandissement au clic si `zoom` est
// actif ET que l'image est affichée plus petite que sa taille réelle — utile
// pour les captures détaillées type courriels.
export function ZoomableImage({ src, alt, size, maxWidth, zoom, caption }) {
  const t = useT()
  const [zoomed, setZoomed] = useState(false)
  const [canZoom, setCanZoom] = useState(false)
  const imgRef = useRef(null)
  const verifier = () => setCanZoom(zoom && estReduite(imgRef.current))
  // Réglages modifiés après chargement (aperçu du builder) : on revérifie.
  useEffect(() => { if (imgRef.current?.complete) verifier() }, [zoom, size, maxWidth])

  // Largeur affichée. `maxWidth: 100%` borne toujours l'image au conteneur —
  // sinon une grande image déborde du cadre sur les écrans plus étroits.
  let width
  if (IMAGE_WIDTHS[size]) width = `${IMAGE_WIDTHS[size]}px`
  else if (size === 'natural') width = 'auto'
  else if (size === 'full') width = '100%'
  else width = maxWidth ? `${maxWidth}px` : '100%'   // 'custom' et questions existantes

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={verifier}
        onClick={canZoom ? () => setZoomed(true) : undefined}
        style={{
          width,
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
          🔍 {t('zoomHint')}
        </p>
      )}
      {caption && (
        <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--gray-500)', textAlign: 'center', margin: 0 }}>
          {caption}
        </p>
      )}
      {zoomed && <ImageLightbox src={src} alt={alt} onClose={() => setZoomed(false)} />}
    </div>
  )
}

// Image d'un choix (MEDIA_RADIO / MEDIA_CHECKBOX). Cliquer sur l'image
// sélectionne le choix ; l'agrandissement passe donc par une loupe dédiée.
function ChoiceImage({ src, alt, size, zoom }) {
  const t = useT()
  const [zoomed, setZoomed] = useState(false)
  const [canZoom, setCanZoom] = useState(false)
  const imgRef = useRef(null)
  const hauteur = size === 'natural' ? 'none' : (CHOICE_IMAGE_HEIGHTS[size] || CHOICE_IMAGE_HEIGHTS.medium)
  const verifier = () => setCanZoom(zoom && estReduite(imgRef.current))
  useEffect(() => { if (imgRef.current?.complete) verifier() }, [zoom, size])

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', marginBottom: 8 }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={verifier}
        style={{ display: 'block', maxHeight: hauteur, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
      />
      {canZoom && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoomed(true) }}
          title={t('zoomOpen')}
          aria-label={t('zoomOpen')}
          style={{
            position: 'absolute', top: 6, right: 6, width: 32, height: 32,
            borderRadius: '50%', border: 'none', cursor: 'zoom-in',
            background: 'rgba(15,23,42,0.65)', color: '#fff', fontSize: 15, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          🔍
        </button>
      )}
      {zoomed && <ImageLightbox src={src} alt={alt} onClose={() => setZoomed(false)} />}
    </div>
  )
}

// Média d'un choix. `settings` = réglages de la question (imageSize, zoom).
// Les tailles et le zoom ne concernent que les images.
export function ChoiceMedia({ c, settings = {} }) {
  if (!c.mediaUrl) return null
  if (c.mediaType === 'image') {
    return <ChoiceImage src={mediaUrl(c.mediaUrl)} alt={c.label} size={settings.imageSize} zoom={settings.zoom === true} />
  }
  if (c.mediaType === 'audio') {
    return (
      <audio
        src={mediaUrl(c.mediaUrl)}
        controls
        style={{ width: '100%', marginBottom: 4 }}
      />
    )
  }
  if (c.mediaType === 'video') {
    const url = mediaUrl(c.mediaUrl) || ''
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title={c.label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', maxHeight: 200, aspectRatio: '16/9', border: 'none', borderRadius: 8, marginBottom: 8 }}
        />
      )
    }
    return (
      <video
        src={url}
        controls
        style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 8 }}
      />
    )
  }
  return null
}
