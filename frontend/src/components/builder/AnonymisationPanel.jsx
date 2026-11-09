// SPDX-License-Identifier: AGPL-3.0-or-later
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'

// « Vérifier les réponses libres » (onglet Export) : le chercheur relit les
// réponses libres avant l'export et masque ce qui pourrait identifier
// quelqu'un (« Paul Durand » → « [NOM] »). MindCraft surligne les passages
// suspects (e-mail, téléphone, date, nom propre…) ; on peut aussi masquer
// n'importe quel passage en le sélectionnant à la souris. Les masques
// s'appliquent aux réponses aux questions de tous les exports (pas aux résultats
// de tâches externes ni aux essais) ; la réponse d'origine reste sur
// le serveur. Voir backend/src/lib/anonymisation.js.

const PAR_PAGE = 50

// Découpe un texte en morceaux : texte normal, passage masqué, passage suspect.
// Les masques passent avant les suggestions ; les plus longs d'abord.
function segmenter(s, masques, suggestions) {
  const marques = []
  const ajouter = (liste, type) => {
    for (const m of [...liste].sort((a, b) => b.texte.length - a.texte.length)) {
      // Comme à l'export (backend/src/lib/anonymisation.js, motifMasque) : mots
      // entiers seulement, sauf si le passage n'apparaît qu'à l'intérieur d'un
      // mot ; mot composé pris en entier.
      const texteEchappe = m.texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const entier = `(?<![\\p{L}\\p{N}])${texteEchappe}(?![\\p{L}\\p{N}])`
      const motif = new RegExp(entier, 'u').test(s) ? entier : texteEchappe
      for (const trouve of s.matchAll(new RegExp(`(?:[\\p{L}\\p{N}]+-)*${motif}(?:-[\\p{L}\\p{N}]+)*`, 'gu'))) {
        const i = trouve.index
        const fin = i + trouve[0].length
        if (!marques.some((x) => i < x.fin && x.debut < fin)) marques.push({ debut: i, fin, type, texte: m.texte, affiche: trouve[0], etiquette: m.etiquette })
      }
    }
  }
  ajouter(masques, 'masque')
  ajouter(suggestions, 'suggestion')
  marques.sort((a, b) => a.debut - b.debut)
  const morceaux = []
  let pos = 0
  for (const m of marques) {
    if (m.debut > pos) morceaux.push({ type: 'texte', texte: s.slice(pos, m.debut) })
    morceaux.push(m)
    pos = m.fin
  }
  if (pos < s.length) morceaux.push({ type: 'texte', texte: s.slice(pos) })
  return morceaux
}

export default function AnonymisationPanel({ studyId, studyStatus }) {
  const queryClient = useQueryClient()
  const cle = ['anonymisation', studyId]
  const { data, isLoading } = useQuery({
    queryKey: cle,
    queryFn: async () => (await api.get(`/api/studies/${studyId}/anonymisation`)).data,
    enabled: !!studyId,
  })
  const [question, setQuestion] = useState('')          // '' = toutes
  // Tout afficher par défaut : la détection ne repère pas tout (noms en minuscules…).
  const [signaleesSeules, setSignaleesSeules] = useState(false)
  const [limite, setLimite] = useState(PAR_PAGE)
  const [enCours, setEnCours] = useState(null)           // { responseId, texte, etiquette }
  const [occupe, setOccupe] = useState(false)

  const questions = data?.questions || []
  const etiquettes = data?.etiquettes || ['[MASQUÉ]']
  const parCle = useMemo(() => Object.fromEntries(questions.map((q) => [q.cle, q])), [questions])
  const reponses = useMemo(() => (data?.reponses || []).filter((r) =>
    (!question || r.cle === question) && (!signaleesSeules || r.suggestions.length || r.masques.length)
  ), [data, question, signaleesSeules])
  const nbMasques = (data?.reponses || []).reduce((n, r) => n + r.masques.length, 0)
  const nbSignalees = (data?.reponses || []).filter((r) => r.aSignaler).length

  const erreur = (err) => toast.error(err?.response?.data?.error || 'Enregistrement impossible. Réessayez.')
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: cle })

  const enregistrer = async (r, masques) => {
    setOccupe(true)
    try {
      await api.put(`/api/studies/${studyId}/anonymisation/${r.id}`, { masques })
      setEnCours(null)
      await rafraichir()
    } catch (err) { erreur(err) } finally { setOccupe(false) }
  }
  const masquer = (r) => enregistrer(r, [...r.masques.filter((m) => m.texte !== enCours.texte), { texte: enCours.texte, etiquette: enCours.etiquette }])
  const demasquer = (r, texte) => enregistrer(r, r.masques.filter((m) => m.texte !== texte))
  const masquerPartout = async () => {
    setOccupe(true)
    try {
      const res = await api.post(`/api/studies/${studyId}/anonymisation/partout`, { texte: enCours.texte, etiquette: enCours.etiquette })
      toast.success(`Passage masqué dans ${res.data.reponses} réponse${res.data.reponses > 1 ? 's' : ''}.`)
      setEnCours(null)
      await rafraichir()
    } catch (err) { erreur(err) } finally { setOccupe(false) }
  }
  const valider = async () => {
    setOccupe(true)
    try {
      await api.post(`/api/studies/${studyId}/anonymisation/valider`)
      toast.success('Vérification inscrite dans le cahier de labo.')
    } catch (err) { erreur(err) } finally { setOccupe(false) }
  }

  // Sélection à la souris dans une réponse : on propose de la masquer.
  const surSelection = (r, ev) => {
    const sel = window.getSelection?.()
    const texte = sel ? sel.toString().trim() : ''
    if (!texte || !ev.currentTarget.contains(sel.anchorNode)) return
    if (!r.textes.some((t) => t.includes(texte))) return toast.error('Sélectionnez un passage à l’intérieur d’un seul champ.')
    setEnCours({ responseId: r.id, texte, etiquette: '[NOM]' })
  }

  if (isLoading) return <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>Chargement des réponses libres…</p>
  if (!data?.reponses?.length) {
    return <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>Aucune réponse libre à vérifier pour l’instant (questions Texte, Saisie, Texte à trous, Liste de mots, Choix + commentaire).</p>
  }

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--gray-700)', lineHeight: 1.55 }}>
        Les passages <mark style={{ background: '#FEF08A', padding: '0 2px' }}>surlignés</mark> pourraient identifier quelqu’un : cliquez dessus pour les masquer.
        Pour masquer un autre passage, sélectionnez-le à la souris. <strong>Relisez toutes les réponses</strong> : la détection ne repère pas tout (nom écrit en minuscules, prénom seul en début de phrase…).
        Un passage masqué est remplacé par son étiquette dans les <strong>réponses aux questions</strong> de tous les exports (CSV questionnaires, Excel, ODS, dépôt). Les résultats de tâches externes et les essais ne sont pas masqués : vérifiez-les s’ils contiennent du texte libre ;
        la réponse d’origine reste sur le serveur. Cliquez sur une étiquette pour annuler le masque.
      </p>

      {studyStatus === 'COLLECTING' && (
        <p role="status" style={{ margin: '0 0 10px', padding: '8px 10px', fontSize: 13, lineHeight: 1.5, color: '#92400E', background: '#FEF3C7', borderRadius: 6 }}>
          La collecte est en cours : les masques, même « Masquer partout », ne couvrent que les réponses déjà reçues. Revenez vérifier les nouvelles réponses avant d’exporter.
        </p>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
        <select className="form-input" style={{ width: 'auto', fontSize: 13 }} value={question} onChange={(e) => { setQuestion(e.target.value); setLimite(PAR_PAGE) }} aria-label="Question">
          <option value="">Toutes les questions libres ({questions.length})</option>
          {questions.map((q) => <option key={q.cle} value={q.cle}>{q.code} — {q.bloc}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={signaleesSeules} onChange={(e) => { setSignaleesSeules(e.target.checked); setLimite(PAR_PAGE) }} />
          Seulement les réponses signalées ou masquées
        </label>
        <span style={{ color: 'var(--gray-500)' }}>
          {data.reponses.length} réponse{data.reponses.length > 1 ? 's' : ''} libre{data.reponses.length > 1 ? 's' : ''}
          {' · '}{nbSignalees} avec un passage signalé non masqué{' · '}{nbMasques} passage{nbMasques > 1 ? 's' : ''} masqué{nbMasques > 1 ? 's' : ''}
        </span>
      </div>

      {!reponses.length && <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>Aucune réponse ne correspond à ces filtres.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reponses.slice(0, limite).map((r) => {
          const q = parCle[r.cle]
          const ouvert = enCours?.responseId === r.id
          return (
            <div key={r.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: '10px 12px', background: '#fff' }}>
              <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginBottom: 4 }}>
                <strong>{q?.code}</strong> · participant {r.participantId.slice(0, 8)}
              </div>
              <div onMouseUp={(ev) => surSelection(r, ev)} style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gray-800)', whiteSpace: 'pre-wrap' }}>
                {r.textes.map((t, i) => (
                  <div key={i}>
                    {segmenter(t, r.masques, r.suggestions).map((m, j) => {
                      if (m.type === 'texte') return <span key={j}>{m.texte}</span>
                      if (m.type === 'masque') {
                        return (
                          <button key={j} type="button" disabled={occupe} onClick={() => demasquer(r, m.texte)} title={`Masque : « ${m.texte} ». Cliquer pour annuler.`}
                            style={{ background: 'var(--gray-700)', color: '#fff', border: 0, borderRadius: 4, padding: '0 5px', fontSize: 12.5, cursor: 'pointer' }}>
                            {m.etiquette}
                          </button>
                        )
                      }
                      return (
                        <mark key={j} onClick={() => setEnCours({ responseId: r.id, texte: m.texte, etiquette: m.etiquette })} title="Passage signalé : cliquer pour le masquer"
                          style={{ background: '#FEF08A', padding: '0 2px', borderRadius: 3, cursor: 'pointer' }}>
                          {m.affiche}
                        </mark>
                      )
                    })}
                  </div>
                ))}
              </div>
              {ouvert && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8, padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 6, fontSize: 13 }}>
                  <span>« {enCours.texte} » →</span>
                  <select className="form-input" style={{ width: 'auto', fontSize: 13 }} value={enCours.etiquette} onChange={(e) => setEnCours({ ...enCours, etiquette: e.target.value })} aria-label="Étiquette">
                    {etiquettes.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <button type="button" className="btn btn-primary btn-sm" disabled={occupe} onClick={() => masquer(r)}>Masquer</button>
                  <button type="button" className="btn btn-sm" disabled={occupe} onClick={masquerPartout} title="Masque ce passage dans toutes les réponses libres de l’étude où il apparaît.">Masquer partout</button>
                  <button type="button" className="btn btn-sm" disabled={occupe} onClick={() => setEnCours(null)}>Annuler</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {reponses.length > limite && (
        <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setLimite((n) => n + PAR_PAGE)}>
          Afficher {Math.min(PAR_PAGE, reponses.length - limite)} réponses de plus ({reponses.length - limite} restantes)
        </button>
      )}

      {nbSignalees > 0 && (
        <p role="status" style={{ margin: '14px 0 0', fontSize: 13, color: '#92400E' }}>
          {nbSignalees} réponse{nbSignalees > 1 ? 's gardent' : ' garde'} un passage signalé non masqué : ce nombre sera inscrit dans le cahier de labo.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary btn-sm" disabled={occupe} onClick={valider}>J’ai terminé la vérification</button>
        <span style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>
          Inscrit dans le cahier de labo le nombre de réponses libres, de passages masqués et de passages restés signalés (sans citer les passages), pour le comité d’éthique ou le DPO.
        </span>
      </div>
    </div>
  )
}
