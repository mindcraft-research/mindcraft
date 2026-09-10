import { useState, useEffect } from 'react'

// Motif par défaut (repris de l'usage LimeSurvey de Pierre-Yves) : une lettre
// fixe F, deux chiffres, une lettre fixe Y, quatre chiffres → ex. F42Y1387.
const DEFAULT_MASK = 'F##Y####'

// Remplace chaque « # » du masque par un chiffre aléatoire ; tout autre
// caractère (lettres, tirets…) est conservé tel quel → forme reconnaissable.
function genFromMask(mask) {
  return (mask || DEFAULT_MASK).replace(/#/g, () => String(Math.floor(Math.random() * 10)))
}

// Question « Code aléatoire » : génère un code unique par passation à partir
// d'un masque configurable, l'affiche au·à la participant·e (avec bouton
// copier) et l'enregistre comme réponse (→ liste des codes valides à l'export).
//
// La génération se fait dans un effet (côté client uniquement) pour éviter tout
// décalage d'hydratation SSR, et une seule fois : une fois `value` remontée, le
// code est stable.
export default function RandomCodeQuestion({ question, value, onChange }) {
  const mask = question.settings?.mask || DEFAULT_MASK
  const [code, setCode] = useState(value || '')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (value) { setCode(value); return }
    const c = genFromMask(mask)
    setCode(c)
    onChange(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* presse-papiers indisponible : le code reste lisible à l'écran */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div
        style={{
          fontFamily: 'monospace', fontSize: 30, fontWeight: 700, letterSpacing: 3,
          color: 'var(--navy, #1f3864)', background: 'var(--gray-50, #f8fafc)',
          border: '2px dashed var(--gray-300, #cbd5e1)', borderRadius: 10,
          padding: '16px 28px', userSelect: 'all',
        }}
      >
        {code || '…'}
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={!code}
        style={{
          fontSize: 14, padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--gray-300, #cbd5e1)', background: 'white',
          color: 'var(--gray-700, #334155)',
        }}
      >
        {copied ? '✓ Copié' : '📋 Copier le code'}
      </button>
    </div>
  )
}
