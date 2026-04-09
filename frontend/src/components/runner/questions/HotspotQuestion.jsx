import { useRef } from 'react'
import styles from '../runner.module.css'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const resolveUrl = (url) => {
  if (!url) return url
  if (url.startsWith('/')) return `${API}${url}`
  return url.replace(/^http:\/\/localhost:\d+/, API)
}

export default function HotspotQuestion({ question, value, onChange }) {
  const imgRef = useRef()
  const settings = question.settings || {}
  const imageUrl = resolveUrl(settings.url)
  const maxW = settings.maxWidth || 600

  const handleClick = (e) => {
    const rect = imgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1)
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1)
    onChange({ x: Number(x), y: Number(y) })
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: maxW, cursor: 'crosshair' }}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Zone cliquable"
        onClick={handleClick}
        style={{
          width: '100%',
          display: 'block',
          borderRadius: 8,
          border: '1.5px solid var(--gray-200)',
        }}
        draggable={false}
      />
      {value?.x != null && value?.y != null && (
        <div
          style={{
            position: 'absolute',
            left: `${value.x}%`,
            top: `${value.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.7)',
            border: '2.5px solid #fff',
            boxShadow: '0 0 0 2px rgba(239,68,68,0.4)',
            pointerEvents: 'none',
          }}
        />
      )}
      {value?.x != null && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>
          Position : {value.x}% , {value.y}%
        </div>
      )}
    </div>
  )
}
