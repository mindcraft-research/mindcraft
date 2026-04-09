import { useMemo } from 'react'
import styles from '../runner.module.css'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'
const mediaUrl = (url) => {
  if (!url) return url
  if (url.startsWith('/')) return `${API}${url}`
  return url.replace(/^http:\/\/localhost:\d+/, API)
}

function shuffleWithAnchors(choices) {
  const anchored = choices.filter((c) => c.anchored)
  const free = choices.filter((c) => !c.anchored)
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[free[i], free[j]] = [free[j], free[i]]
  }
  const result = [...free]
  anchored.forEach((a) => {
    const origIdx = choices.indexOf(a)
    result.splice(origIdx, 0, a)
  })
  return result
}

function ChoiceMedia({ c }) {
  if (!c.mediaUrl) return null
  if (c.mediaType === 'image') {
    return (
      <img
        src={mediaUrl(c.mediaUrl)}
        alt={c.label}
        style={{
          maxHeight: 200,
          maxWidth: '100%',
          borderRadius: 8,
          objectFit: 'contain',
          marginBottom: 8,
        }}
      />
    )
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

export default function MediaCheckboxQuestion({ question, value = [], onChange }) {
  const choices = useMemo(
    () => (question.randomize ? shuffleWithAnchors(question.choices) : question.choices),
    [question.id]
  )

  const toggle = (code) => {
    const arr = Array.isArray(value) ? value : []
    onChange(arr.includes(code) ? arr.filter((v) => v !== code) : [...arr, code])
  }

  return (
    <div className={styles.choiceList}>
      {choices.map((c) => {
        const selected = Array.isArray(value) && value.includes(c.code)
        const hasMedia = !!c.mediaUrl

        return (
          <div
            key={c.id}
            className={`${styles.choiceItem} ${selected ? styles.choiceItemSelected : ''}`}
            onClick={() => toggle(c.code)}
            style={hasMedia ? { flexDirection: 'column', alignItems: 'flex-start' } : undefined}
          >
            {hasMedia && <ChoiceMedia c={c} />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className={`${styles.choiceCheck} ${selected ? styles.choiceCheckSelected : ''}`}
              >
                {selected && '✓'}
              </div>
              <span className={styles.choiceLabel}>{c.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
