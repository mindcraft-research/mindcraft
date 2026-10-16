import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

// Consultation d'un préenregistrement verrouillé, sans compte, par son lien :
//   - lien relecteur : version anonyme (sans auteurs), toujours active ;
//   - lien public : version complète, si le propriétaire l'a activée ;
//   - préenregistrement retiré (à la demande des auteurs) : avis de retrait
//     daté et motivé, contenu effacé.
// Les titres suivent la langue choisie pour le préenregistrement (comme le PDF).

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

const TXT = {
  fr: {
    titre: 'Préenregistrement', sansTitre: 'Sans titre', chargement: 'Chargement…',
    introuvable: 'Ce préenregistrement est introuvable, ou son lien public a été désactivé.',
    verrouille: (d) => `Verrouillé sur MindCraft le ${d} (heure de Paris).`,
    immuable: 'Ce texte ne peut plus être modifié. Les ajouts éventuels figurent dans les amendements, en bas de page.',
    empreinte: 'Empreinte du texte (SHA-256)', modele: 'Modèle', pdf: 'Télécharger le PDF',
    anonyme: 'Version pour relecture anonyme : les noms des auteurs sont masqués.',
    auteursMasques: 'Auteurs masqués.', aucunAuteur: 'Aucun auteur indiqué.', pasDeReponse: '(pas de réponse)',
    amendements: 'Amendements', amendementsIntro: 'Ajoutés après le verrouillage. Ils complètent le texte sans le modifier.',
    categories: { PRECISION: 'Précision', MINEUR: 'Écart mineur', MAJEUR: 'Écart majeur' },
    retire: 'Préenregistrement retiré',
    retireLe: (d) => `Ce préenregistrement a été retiré le ${d} (heure de Paris), à la demande de ses auteurs. Son contenu a été effacé.`,
    motif: 'Motif', verrouilleInitial: (d) => `Il avait été verrouillé sur MindCraft le ${d}.`,
  },
  en: {
    titre: 'Preregistration', sansTitre: 'Untitled', chargement: 'Loading…',
    introuvable: 'This preregistration cannot be found, or its public link has been disabled.',
    verrouille: (d) => `Locked on MindCraft on ${d} (Paris time).`,
    immuable: 'This text can no longer be changed. Any additions are listed as amendments at the bottom of the page.',
    empreinte: 'Text fingerprint (SHA-256)', modele: 'Template', pdf: 'Download PDF',
    anonyme: 'Anonymized version for peer review: author names are hidden.',
    auteursMasques: 'Authors hidden.', aucunAuteur: 'No author listed.', pasDeReponse: '(no response)',
    amendements: 'Amendments', amendementsIntro: 'Added after locking. They complement the text without changing it.',
    categories: { PRECISION: 'Clarification', MINEUR: 'Minor deviation', MAJEUR: 'Major deviation' },
    retire: 'Preregistration withdrawn',
    retireLe: (d) => `This preregistration was withdrawn on ${d} (Paris time), at the request of its authors. Its content has been erased.`,
    motif: 'Reason', verrouilleInitial: (d) => `It had been locked on MindCraft on ${d}.`,
  },
}

const dateHeure = (d, langue) => new Date(d).toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' })

function reponse(q, v, langue) {
  if (q.type === 'choix') return q.options.find((o) => o.valeur === v)?.[langue] || ''
  if (q.type === 'choixMultiples') return (Array.isArray(v) ? v : []).map((x) => `– ${q.options.find((o) => o.valeur === x)?.[langue] || x}`).join('\n')
  return String(v ?? '').trim()
}

export default function PreregPublic() {
  const router = useRouter()
  const { token } = router.query
  const [etat, setEtat] = useState('chargement') // chargement | ok | introuvable
  const [donnees, setDonnees] = useState(null)

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/api/prereg/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('introuvable'))))
      .then((d) => { setDonnees(d); setEtat('ok') })
      .catch(() => setEtat('introuvable'))
  }, [token])

  const langue = donnees?.prereg?.language === 'en' ? 'en' : 'fr'
  const t = TXT[langue]
  const p = donnees?.prereg
  const titre = String(p?.answers?.title || '').trim() || t.sansTitre

  const page = { minHeight: '100vh', background: '#f8fafc', color: '#111827', fontFamily: 'Inter, system-ui, sans-serif', padding: '32px 16px' }
  const colonne = { maxWidth: 820, margin: '0 auto' }
  const carte = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }
  const gris = { color: '#6b7280', fontSize: 13 }

  return (
    <div style={page}>
      <Head>
        <title>{etat === 'ok' ? (p.withdrawn ? `${t.retire} · MindCraft` : `${t.titre} · ${titre}`) : 'MindCraft'}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div style={colonne}>
        <div style={{ ...gris, marginBottom: 10 }}>MindCraft · {t.titre}</div>

        {etat === 'chargement' && <p style={gris}>{TXT.fr.chargement}</p>}
        {etat === 'introuvable' && (
          <div style={carte}>
            <p style={{ margin: 0 }}>{TXT.fr.introuvable}</p>
            <p style={{ margin: '6px 0 0', ...gris }}>{TXT.en.introuvable}</p>
          </div>
        )}

        {etat === 'ok' && p.withdrawn && (
          <div style={{ ...carte, borderColor: '#fecaca' }}>
            <h1 style={{ margin: 0, fontSize: 20, color: '#991b1b' }}>{t.retire}</h1>
            <p style={{ margin: '10px 0 0', fontSize: 14.5 }}>{t.retireLe(dateHeure(p.withdrawnAt, langue))}</p>
            {p.withdrawalReason && <p style={{ margin: '8px 0 0', fontSize: 14.5, whiteSpace: 'pre-wrap' }}><strong>{t.motif} :</strong> {p.withdrawalReason}</p>}
            <p style={{ margin: '10px 0 0', ...gris, wordBreak: 'break-all' }}>{t.verrouilleInitial(dateHeure(p.lockedAt, langue))} {t.empreinte} : {p.fingerprint}</p>
          </div>
        )}

        {etat === 'ok' && !p.withdrawn && (
          <>
            <div style={carte}>
              <h1 style={{ margin: 0, fontSize: 22, color: '#1e3a5f' }}>{titre}</h1>
              <p style={{ margin: '10px 0 0', fontSize: 14, color: '#0f766e', fontWeight: 600 }}>{t.verrouille(dateHeure(p.lockedAt, langue))}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13.5 }}>{t.immuable}</p>
              {donnees.anonyme && <p style={{ margin: '8px 0 0', fontSize: 13.5, color: '#92400e' }}>{t.anonyme}</p>}
              <p style={{ margin: '10px 0 0', ...gris }}>{donnees.template?.source?.[langue] || `${t.modele} : ${donnees.template?.nom}`}</p>
              <p style={{ margin: '4px 0 0', ...gris, wordBreak: 'break-all' }}>{t.empreinte} : {p.fingerprint}</p>
              <a
                href={`${API_BASE}/api/prereg/${encodeURIComponent(token)}/pdf`}
                style={{ display: 'inline-block', marginTop: 12, padding: '8px 14px', background: '#4f46e5', color: '#fff', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
              >{t.pdf}</a>
            </div>

            {donnees.template.sections.map((s) => (
              <div key={s.cle} style={carte}>
                <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#1e3a5f' }}>{s[langue]}</h2>
                {s.questions.filter((q) => q.cle !== 'title').map((q) => {
                  let texte
                  if (q.type === 'auteurs') {
                    texte = donnees.anonyme ? t.auteursMasques
                      : (p.authors || []).map((a) => [a.name, a.affiliation].filter(Boolean).join(', ')).join('\n') || t.aucunAuteur
                  } else {
                    texte = reponse(q, p.answers?.[q.cle], langue)
                  }
                  return (
                    <div key={q.cle} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{q[langue]}</div>
                      <p style={{ margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: texte ? '#111827' : '#9ca3af' }}>{texte || t.pasDeReponse}</p>
                    </div>
                  )
                })}
              </div>
            ))}

            {(p.amendments || []).length > 0 && (
              <div style={carte}>
                <h2 style={{ margin: '0 0 4px', fontSize: 16, color: '#1e3a5f' }}>{t.amendements}</h2>
                <p style={{ margin: '0 0 12px', ...gris }}>{t.amendementsIntro}</p>
                {p.amendments.map((a, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #d1d5db', padding: '4px 0 4px 12px', marginBottom: 10 }}>
                    <div style={gris}>{dateHeure(a.createdAt, langue)} · <strong>{t.categories[a.category] || a.category}</strong>{a.authorName ? ` · ${a.authorName}` : ''}</div>
                    <p style={{ margin: '4px 0 0', fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
