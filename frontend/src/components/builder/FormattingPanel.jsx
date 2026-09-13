import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'

// Onglet « Mise en forme » (issue #143, points 12/13/14 + extensions).
// Réglages de présentation appliqués à TOUTE l'étude. Stockés dans
// study.metadata.formatting et appliqués par le runner via variables CSS
// (voir StudyRunner + runner.module.css). 100 % / valeurs par défaut =
// rendu d'origine (rétrocompatible).
//
// Taille des items/réponses : reportée (phase 2, uniformisation des composants).

const ENONCE_PRESETS = [85, 100, 115, 130]
const INTRO_PRESETS = [85, 100, 115, 130]
const GAP_PRESETS = [75, 100, 150, 200]
const WIDTH_PRESETS = [
  { label: 'Étroite', v: 760 },
  { label: 'Standard', v: 1100 },
  { label: 'Large', v: 1300 },
]
const DEFAULT_ACCENT = '#059669'
const DEFAULT_WIDTH = 1100

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
  const [introScale, setIntroScale] = useState(initial.introScale ?? 100)
  const [questionGap, setQuestionGap] = useState(initial.questionGap ?? 100)
  const [contentWidth, setContentWidth] = useState(initial.contentWidth ?? DEFAULT_WIDTH)
  const [accentColor, setAccentColor] = useState(initial.accentColor ?? null)
  const initBtn = initial.buttons || {}
  const [nextLabel, setNextLabel] = useState(initBtn.nextLabel ?? '')
  const [continueLabel, setContinueLabel] = useState(initBtn.continueLabel ?? '')
  const [finishLabel, setFinishLabel] = useState(initBtn.finishLabel ?? '')

  const savedEnonce = initial.enonceScale ?? 100
  const savedIntro = initial.introScale ?? 100
  const savedGap = initial.questionGap ?? 100
  const savedWidth = initial.contentWidth ?? DEFAULT_WIDTH
  const savedAccent = initial.accentColor ?? null
  const dirty =
    clampPct(enonceScale) !== savedEnonce ||
    clampPct(introScale) !== savedIntro ||
    clampPct(questionGap) !== savedGap ||
    contentWidth !== savedWidth ||
    (accentColor || null) !== savedAccent ||
    nextLabel.trim() !== (initBtn.nextLabel ?? '') ||
    continueLabel.trim() !== (initBtn.continueLabel ?? '') ||
    finishLabel.trim() !== (initBtn.finishLabel ?? '')

  const save = useMutation({
    mutationFn: () => api.patch(`/api/studies/${studyId}`, {
      metadata: {
        ...(study?.metadata || {}),
        formatting: {
          enonceScale: clampPct(enonceScale),
          introScale: clampPct(introScale),
          questionGap: clampPct(questionGap),
          contentWidth: Number(contentWidth) || DEFAULT_WIDTH,
          accentColor: accentColor || null,
          buttons: {
            nextLabel: nextLabel.trim(),
            continueLabel: continueLabel.trim(),
            finishLabel: finishLabel.trim(),
          },
        },
      },
    }),
    onSuccess: () => { toast.success('Mise en forme enregistrée'); onSaved?.() },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  })

  const reset = () => {
    setEnonceScale(100); setIntroScale(100); setQuestionGap(100)
    setContentWidth(DEFAULT_WIDTH); setAccentColor(null)
    setNextLabel(''); setContinueLabel(''); setFinishLabel('')
  }

  // Facteurs pour l'aperçu (mêmes bases que le runner).
  const eF = (Number(enonceScale) || 100) / 100
  const iF = (Number(introScale) || 100) / 100
  const gF = (Number(questionGap) || 100) / 100
  const accent = accentColor || DEFAULT_ACCENT

  return (
    <div style={{ maxWidth: 960, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 28, alignItems: 'start' }}>
      {/* ── Réglages ── */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px' }}>Mise en forme</h2>
        <p style={{ fontSize: 13.5, color: 'var(--gray-600)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Ces réglages s'appliquent à <strong>toute l'étude</strong> (valeurs par défaut =
          rendu actuel). Les tailles sont en pourcentage, pour un rendu proportionnel sur
          tous les écrans.
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
        <PctControl
          label="Taille des textes d'accueil et de fin"
          hint="Pages « Message d'accueil » et « Message de fin »."
          presets={INTRO_PRESETS}
          value={introScale}
          onChange={setIntroScale}
        />

        {/* Largeur du contenu */}
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label">Largeur du contenu</label>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', margin: '0 0 8px' }}>
            Largeur de la colonne où s'affichent les questions. Une colonne plus étroite améliore la lisibilité.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WIDTH_PRESETS.map((p) => (
              <button
                key={p.v}
                type="button"
                className={`btn btn-sm ${Number(contentWidth) === p.v ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setContentWidth(p.v)}
              >{p.label}</button>
            ))}
          </div>
        </div>

        {/* Couleur d'accent */}
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label">Couleur d'accent</label>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', margin: '0 0 8px' }}>
            Sélection des réponses, barre de progression et liens.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="color"
              value={accentColor || DEFAULT_ACCENT}
              onChange={(e) => setAccentColor(e.target.value)}
              style={{ width: 44, height: 34, padding: 2, border: '1px solid var(--gray-200)', borderRadius: 6, cursor: 'pointer', background: '#fff' }}
              title="Choisir une couleur"
            />
            <input
              type="text"
              className="form-input"
              style={{ width: 120 }}
              value={accentColor || ''}
              placeholder={`${DEFAULT_ACCENT} (défaut)`}
              onChange={(e) => setAccentColor(e.target.value || null)}
            />
            {accentColor && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAccentColor(null)}>
                Par défaut
              </button>
            )}
          </div>
        </div>

        {/* Libellés des boutons de navigation */}
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label">Libellés des boutons</label>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', margin: '0 0 8px' }}>
            Laisser vide pour garder le libellé par défaut.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Question suivante</div>
              <input className="form-input" value={nextLabel} placeholder="Suivant" onChange={(e) => setNextLabel(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Valider le bloc</div>
              <input className="form-input" value={continueLabel} placeholder="Continuer" onChange={(e) => setContinueLabel(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 3 }}>Fin de l'étude</div>
              <input className="form-input" value={finishLabel} placeholder="Terminer" onChange={(e) => setFinishLabel(e.target.value)} />
            </div>
          </div>
        </div>

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
            Tout réinitialiser
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
          {/* Échantillon accueil */}
          <div style={{ fontSize: `${22 * iF}px`, fontWeight: 600, color: 'var(--navy)', marginBottom: `${18 * iF}px` }}>
            Bienvenue dans l'étude
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${32 * gF}px` }}>
            {[
              { q: 'À quelle fréquence pratiquez-vous une activité physique ?', a: ['Jamais', 'Parfois', 'Souvent'], sel: 'Souvent' },
              { q: 'Diriez-vous que votre sommeil est réparateur ?', a: ['Oui', 'Non'], sel: null },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: `${16 * eF}px`, color: 'var(--gray-800)', lineHeight: 1.6 }}>{item.q}</div>
                {item.a.map((opt) => {
                  const selected = opt === item.sel
                  return (
                    <div key={opt} style={{
                      display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, padding: '10px 12px',
                      border: `1px solid ${selected ? accent : 'var(--gray-200)'}`,
                      background: selected ? `color-mix(in srgb, ${accent} 10%, white)` : '#fff',
                    }}>
                      <span style={{
                        width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${selected ? accent : 'var(--gray-300)'}`,
                        background: selected ? accent : 'transparent',
                      }} />
                      <span style={{ fontSize: 14, color: 'var(--gray-700)' }}>{opt}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10 }}>
          Aperçu indicatif (la largeur de colonne s'applique à la vraie page de passation).
        </p>
      </div>
    </div>
  )
}
