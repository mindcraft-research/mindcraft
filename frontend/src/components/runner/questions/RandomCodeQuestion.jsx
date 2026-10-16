import { useState, useEffect } from 'react'
import { useT } from '../../../lib/runnerStrings'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

// Motif par défaut (usage courant sous LimeSurvey) : une lettre fixe F, deux
// chiffres, une lettre fixe Y, quatre chiffres → ex. F42Y1387.
const DEFAULT_MASK = 'F##Y####'

// Remplace chaque « # » du masque par un chiffre aléatoire ; tout autre
// caractère (lettres, tirets…) est conservé tel quel → forme reconnaissable.
function genFromMask(mask) {
  return (mask || DEFAULT_MASK).replace(/#/g, () => String(Math.floor(Math.random() * 10)))
}

// Question « Code aléatoire » : un code par passation, affiché au·à la
// participant·e (avec bouton copier) et enregistré comme réponse (→ liste des
// codes valides à l'export).
//
// Le code est tiré par le SERVEUR, qui garantit qu'aucun autre participant de
// l'étude n'a le même (voir backend lib/randomCode.js) ; une page rechargée
// retrouve le même code. Jamais de tirage local (il pourrait faire doublon) :
// si le serveur ne peut pas en donner (réseau coupé, format épuisé), un
// message s'affiche à la place. En prévisualisation, simple code d'exemple.
//
// Tirage au montage (côté client uniquement : pas de décalage d'hydratation),
// une seule fois : une fois `value` remontée, le code est stable.
export default function RandomCodeQuestion({ question, value, onChange, studyId, participantId, isPreview }) {
  const mask = question.settings?.mask || DEFAULT_MASK
  const [code, setCode] = useState(value || '')
  const [indisponible, setIndisponible] = useState(false)
  const [copied, setCopied] = useState(false)
  const t = useT()

  useEffect(() => {
    if (value) { setCode(value); return undefined }
    let annule = false
    const fixer = (c) => { if (!annule) { setCode(c); onChange(c) } }
    if (isPreview || !studyId || !participantId) { fixer(genFromMask(mask)); return undefined }

    ;(async () => {
      for (let essai = 0; essai < 4; essai++) {
        if (essai > 0) await new Promise((r) => setTimeout(r, 800 * essai))
        try {
          const res = await fetch(`${API_BASE}/api/run/${studyId}/random-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId, questionCode: question.code }),
          })
          if (res.ok) { fixer((await res.json()).code); return }
          if (res.status < 500 && res.status !== 429) break
        } catch { /* réseau : nouvel essai */ }
      }
      if (!annule) setIndisponible(true)
    })()
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (indisponible && !code) {
    return (
      <p style={{ textAlign: 'center', padding: '12px 0', color: 'var(--gray-700, #334155)', fontSize: 15 }}>
        {t('codeUnavailable')}
      </p>
    )
  }

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
        {copied ? t('copied') : t('copyCode')}
      </button>
    </div>
  )
}
