import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'

// Onglet « Mise en forme » (issue #143, points 12/13/14).
// Réglages de présentation appliqués à TOUTE l'étude, en pourcentage
// (100 % = rendu par défaut). Stockés dans study.metadata.formatting et
// appliqués par le runner via variables CSS (voir StudyRunner + runner.module.css).
//
// Phase 1 : taille des énoncés + espace entre les questions (fiables sur tous
// les types de questions). La taille des items/réponses viendra ensuite, une
// fois les composants de réponse uniformisés.

const ENONCE_PRESETS = [85, 100, 115, 130]
const GAP_PRESETS = [75, 100, 150, 200]
const clampPct = (v) => Math.min(300, Math.max(50, Math.round(Number(v) || 100)))

function PctControl({ label, hint, presets, value, onChange }) {
  return (
    <div className="form-group" style={{ marginBottom: 22 }}>
      <label className="form-label">{label}</label>
      {hint && <div style={{ fontSize: 12, color: 'var(--gray-500)', margin: '0 0 8px' }}>{hint}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${value === p ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChange(p)}
          >{p} %</button>
        ))}
        <span style={{ width: 1, height: 22, background: 'var(--gray-200)', margin: '0 2px' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            className="form-input"
            style={{ width: 84 }}
            min={50}
            max={300}
            step={5}
            value={value}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={(e) => onChange(clampPct(e.target.value))}
          />
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>%</span>
        </div>
      </div>
    </div>
  )
}

export default function FormattingPanel({ study, studyId, onSaved }) {
  const initial = study?.metadata?.formatting || {}
  const [enonceScale, setEnonceScale] = useState(initial.enonceScale ?? 100)
  const [questionGap, setQuestionGap] = useState(initial.questionGap ?? 100)

  const savedEnonce = initial.enonceScale ?? 100
  const savedGap = initial.questionGap ?? 100
  const dirty = clampPct(enonceScale) !== savedEnonce || clampPct(questionGap) !== savedGap

  const save = useMutation({
    mutationFn: () => api.patch(`/api/studies/${studyId}`, {
      metadata: {
        ...(study?.metadata || {}),
        formatting: { enonceScale: clampPct(enonceScale), questionGap: clampPct(questionGap) },
      },
    }),
    onSuccess: () => { toast.success('Mise en forme enregistrée'); onSaved?.() },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  })

  const reset = () => { setEnonceScale(100); setQuestionGap(100) }

  // Facteurs pour l'aperçu (mêmes bases que le runner : 16px, gap 32px).
  const eF = (Number(enonceScale) || 100) / 100
  const gF = (Number(questionGap) || 100) / 100

  return (
    <div style={{ maxWidth: 940, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 28, alignItems: 'start' }}>
      {/* ── Réglages ── */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px' }}>Mise en forme</h2>
        <p style={{ fontSize: 13.5, color: 'var(--gray-600)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Ces réglages s'appliquent à <strong>toute l'étude</strong>. Les valeurs sont en
          pourcentage de la taille par défaut (100 %), pour un rendu proportionnel sur tous
          les écrans (ordinateur, mobile…).
        </p>

        <PctControl
          label="Taille des énoncés"
          hint="Taille du texte des questions (leur intitulé)."
          presets={ENONCE_PRESETS}
          value={enonceScale}
          onChange={setEnonceScale}
        />
        <PctControl
          label="Espace entre les questions"
          hint="Écart vertical entre deux questions d'un même bloc."
          presets={GAP_PRESETS}
          value={questionGap}
          onChange={setQuestionGap}
        />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
            Réinitialiser (100 %)
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12 }}>
          À venir : réglage de la taille des réponses / items.
        </p>
      </div>

      {/* ── Aperçu ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 8 }}>
          Aperçu
        </div>
        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, padding: 20, background: '#fff' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${32 * gF}px` }}>
            {[
              { q: 'À quelle fréquence pratiquez-vous une activité physique ?', a: ['Jamais', 'Parfois', 'Souvent'] },
              { q: 'Diriez-vous que votre sommeil est réparateur ?', a: ['Oui', 'Non'] },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: `${16 * eF}px`, color: 'var(--gray-800)', lineHeight: 1.6 }}>{item.q}</div>
                {item.a.map((opt) => (
                  <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--gray-200)', borderRadius: 8, padding: '10px 12px' }}>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid var(--gray-300)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'var(--gray-700)' }}>{opt}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10 }}>
          Aperçu indicatif : seuls les énoncés et l'espacement varient ici.
        </p>
      </div>
    </div>
  )
}
