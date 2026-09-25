import { useState, useMemo, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { confirmDelete } from '../../lib/confirm'
import catalog from '../../lib/i18nCatalog'
import { Tooltip } from './FormWidgets'

const { collectStrings, displayText, LANGUAGE_NAMES, DEFAULT_LANG } = catalog

// Onglet « Langues » : traductions d'une étude, à la manière de Qualtrics.
//
// - La langue d'origine est celle dans laquelle l'étude est rédigée (français).
// - Chaque langue ajoutée a sa colonne ; la table liste TOUS les textes vus
//   par le·la participant·e (énoncés, choix, lignes, consignes, boutons…),
//   groupés par bloc, avec un compteur de complétude.
// - La langue est imposée par le lien de participation (?lang=en) ; le
//   participant ne choisit pas. La mise en collecte est refusée tant qu'une
//   langue n'est pas complète (contrôle côté serveur).
// - Export / import CSV pour confier la traduction à quelqu'un d'autre.
//
// Stockage : study.metadata.i18n (voir lib/i18nCatalog.js). Sans langue
// ajoutée, rien ne change pour l'étude.

const ADDABLE = ['en', 'de', 'es', 'it', 'nl', 'pt']

const emptyI18n = () => ({ defaultLang: DEFAULT_LANG, languages: [], translations: {} })

export default function TranslationsPanel({ study, studyId, onSaved }) {
  const saved = study?.metadata?.i18n || emptyI18n()
  const defaultLang = saved.defaultLang || DEFAULT_LANG

  const [languages, setLanguages] = useState(saved.languages || [])
  const [translations, setTranslations] = useState(saved.translations || {})
  const [activeLang, setActiveLang] = useState((saved.languages || [])[0] || '')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const fileRef = useRef()

  // Nouvelle étude chargée (autre id) : repartir des données enregistrées.
  useEffect(() => {
    const s = study?.metadata?.i18n || emptyI18n()
    setLanguages(s.languages || [])
    setTranslations(s.translations || {})
    setActiveLang((s.languages || [])[0] || '')
    setDirty(false)
  }, [studyId])

  const entries = useMemo(() => collectStrings(study || {}), [study])
  const groups = useMemo(() => {
    const map = new Map()
    for (const e of entries) {
      if (!map.has(e.group)) map.set(e.group, { group: e.group, order: e.groupOrder, items: [] })
      map.get(e.group).items.push(e)
    }
    return [...map.values()].sort((a, b) => a.order - b.order)
  }, [entries])

  const dict = translations[activeLang] || {}
  const isDone = (e) => typeof dict[e.key] === 'string' && dict[e.key].trim() !== ''
  const doneCount = entries.filter(isDone).length
  const total = entries.length
  const pct = total ? Math.round((doneCount / total) * 100) : 100

  const setTranslation = (key, value) => {
    setTranslations((prev) => ({ ...prev, [activeLang]: { ...(prev[activeLang] || {}), [key]: value } }))
    setDirty(true)
  }

  const addLanguage = (code) => {
    if (!code || languages.includes(code)) return
    setLanguages((l) => [...l, code])
    setTranslations((t) => ({ ...t, [code]: t[code] || {} }))
    setActiveLang(code)
    setDirty(true)
  }

  // Enregistre l'état donné (langues + traductions non vides). Retourne true
  // si l'enregistrement a réussi.
  const persist = async (langs, trans, successMsg) => {
    setSaving(true)
    try {
      const clean = {}
      for (const l of langs) {
        clean[l] = {}
        for (const [k, v] of Object.entries(trans[l] || {})) if (typeof v === 'string' && v.trim()) clean[l][k] = v
      }
      await api.patch(`/api/studies/${studyId}`, {
        metadata: { ...(study?.metadata || {}), i18n: { defaultLang, languages: langs, translations: clean } },
      })
      setDirty(false)
      toast.success(successMsg)
      onSaved?.()
      return true
    } catch {
      toast.error("Erreur lors de l'enregistrement")
      return false
    } finally {
      setSaving(false)
    }
  }

  const save = () => persist(languages, translations, 'Traductions enregistrées')

  // Retirer une langue : confirmation, puis enregistrement immédiat (comme
  // toute suppression dans MindCraft, rien d'autre à faire ensuite).
  const removeLanguage = async (code) => {
    const name = LANGUAGE_NAMES[code] || code
    const n = Object.values(translations[code] || {}).filter((v) => v && v.trim()).length
    const ok = await confirmDelete({
      title: 'Retirer cette langue ?',
      what: `la langue « ${name} »${n ? ` et ses ${n} traduction${n > 1 ? 's' : ''}` : ''}`,
      detail: `Les liens « ?lang=${code} » afficheront l'étude en ${LANGUAGE_NAMES[defaultLang] || defaultLang}. Cette action est irréversible.`,
      confirmLabel: 'Retirer la langue',
    })
    if (!ok) return
    const nextLangs = languages.filter((x) => x !== code)
    const nextTrans = { ...translations }
    delete nextTrans[code]
    if (await persist(nextLangs, nextTrans, `${name} retiré de l'étude`)) {
      setLanguages(nextLangs)
      setTranslations(nextTrans)
      if (activeLang === code) setActiveLang(nextLangs[0] || '')
    }
  }

  // ── Export / import CSV ────────────────────────────────────────────────────
  const exportCsv = () => {
    const cols = ['cle', 'bloc', 'element', defaultLang, ...languages]
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [cols.map(esc).join(';')]
    for (const e of entries) {
      lines.push([e.key, e.group, e.label, e.original, ...languages.map((l) => (translations[l] || {})[e.key] || '')].map(esc).join(';'))
    }
    // BOM : Excel (français) ouvre le fichier en UTF-8 avec « ; » comme séparateur.
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traductions_${(study?.name || studyId).replace(/[^\w]+/g, '_')}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const importCsv = async (file) => {
    if (!file) return
    try {
      const text = (await file.text()).replace(/^﻿/, '')
      const rows = parseCsv(text)
      if (rows.length < 2) throw new Error('Fichier vide')
      const header = rows[0].map((h) => h.trim().toLowerCase())
      const keyIdx = header.indexOf('cle')
      if (keyIdx === -1) throw new Error('Colonne « cle » introuvable : exportez d’abord le fichier depuis cet onglet, puis remplissez-le.')
      const known = new Set(entries.map((e) => e.key))
      const langCols = header.map((h, i) => ({ h, i })).filter(({ h }) => h !== defaultLang && /^[a-z]{2}$/.test(h))
      if (langCols.length === 0) throw new Error('Aucune colonne de langue (ex. « en ») dans le fichier.')
      let count = 0, unknown = 0
      const next = JSON.parse(JSON.stringify(translations))
      const newLangs = [...languages]
      for (const row of rows.slice(1)) {
        const key = (row[keyIdx] || '').trim()
        if (!key) continue
        if (!known.has(key)) { unknown++; continue }
        for (const { h, i } of langCols) {
          const v = (row[i] || '').trim()
          if (!v) continue
          if (!newLangs.includes(h)) newLangs.push(h)
          next[h] = next[h] || {}
          next[h][key] = v
          count++
        }
      }
      setTranslations(next)
      setLanguages(newLangs)
      if (!activeLang && newLangs[0]) setActiveLang(newLangs[0])
      setDirty(true)
      toast.success(`${count} traduction${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''}${unknown ? ` — ${unknown} ligne${unknown > 1 ? 's' : ''} ignorée${unknown > 1 ? 's' : ''} (clé inconnue)` : ''}. Pensez à enregistrer.`)
    } catch (err) {
      toast.error(`Import impossible : ${err.message}`)
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase()
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((e) =>
        (!onlyMissing || !isDone(e)) &&
        (!q || e.label.toLowerCase().includes(q) || displayText(e.original).toLowerCase().includes(q) || (dict[e.key] || '').toLowerCase().includes(q))
      ),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div style={{ maxWidth: 1100, padding: '4px 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Langues
            <Tooltip text="Une même étude peut être proposée en plusieurs langues. La langue d'origine est celle dans laquelle vous rédigez l'étude. Pour chaque langue ajoutée, traduisez ici tous les textes que verra le participant. La langue est fixée par le lien de participation (?lang=en) : le participant ne la choisit pas. La mise en collecte est refusée tant qu'une langue n'est pas complète. Les codes de questions sont identiques dans toutes les langues : les données se retrouvent dans un seul export, avec une colonne « lang »." />
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--gray-600)', margin: 0, lineHeight: 1.5, maxWidth: 640 }}>
            Langue d'origine : <strong>{LANGUAGE_NAMES[defaultLang] || defaultLang}</strong>. Ajoutez une langue,
            traduisez chaque texte (ou exportez le fichier pour le faire traduire), puis enregistrez. Le lien
            de participation par langue se trouve dans « Lien participation ».
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-input"
            style={{ width: 'auto', fontSize: 13 }}
            value=""
            onChange={(e) => addLanguage(e.target.value)}
          >
            <option value="">+ Ajouter une langue…</option>
            {ADDABLE.filter((c) => c !== defaultLang && !languages.includes(c)).map((c) => (
              <option key={c} value={c}>{LANGUAGE_NAMES[c]} ({c})</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={entries.length === 0} title="Fichier CSV : une ligne par texte, une colonne par langue. À ouvrir dans Excel ou LibreOffice.">
            Exporter les textes
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} title="Réimporter le fichier exporté, une fois les colonnes de langue remplies.">
            Importer…
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = '' }} />
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Enregistrement…' : dirty ? 'Enregistrer' : 'Enregistré'}
          </button>
        </div>
      </div>

      {languages.length === 0 ? (
        <div style={{ border: '1px dashed var(--gray-300)', borderRadius: 12, padding: '28px 24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>
          Cette étude est pour l'instant en <strong>{LANGUAGE_NAMES[defaultLang] || defaultLang}</strong> uniquement.
          <br />Ajoutez une langue pour commencer à traduire — {entries.length} texte{entries.length > 1 ? 's' : ''} à traduire.
        </div>
      ) : (
        <>
          {/* Onglets de langue + progression */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {languages.map((l) => {
              const d = translations[l] || {}
              const n = entries.filter((e) => typeof d[e.key] === 'string' && d[e.key].trim()).length
              const active = l === activeLang
              return (
                <span
                  key={l}
                  style={{
                    display: 'inline-flex', alignItems: 'center', borderRadius: 8, overflow: 'hidden',
                    background: active ? 'var(--navy)' : 'var(--gray-100)', color: active ? '#fff' : 'var(--gray-700)',
                  }}
                >
                  <button
                    onClick={() => setActiveLang(l)}
                    className="btn btn-sm"
                    style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8, paddingRight: 6 }}
                  >
                    {LANGUAGE_NAMES[l] || l}
                    <span style={{ fontSize: 11, opacity: .8 }}>{n}/{total}</span>
                    {n === total && total > 0 && <span title="Complète">✓</span>}
                  </button>
                  <button
                    onClick={() => removeLanguage(l)}
                    title={`Retirer ${LANGUAGE_NAMES[l] || l} de l'étude`}
                    aria-label={`Retirer ${LANGUAGE_NAMES[l] || l}`}
                    disabled={saving}
                    style={{
                      background: 'none', border: 'none', color: 'inherit', opacity: .7, cursor: 'pointer',
                      padding: '0 10px 0 4px', alignSelf: 'stretch', display: 'flex', alignItems: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>
                  </button>
                </span>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 260px', minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>
                <span>{LANGUAGE_NAMES[activeLang] || activeLang} : <strong>{doneCount} / {total}</strong> textes traduits</span>
                <span>{pct} %</span>
              </div>
              <div style={{ height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--teal, #059669)' : 'var(--brand, #4F46E5)', transition: 'width .2s' }} />
              </div>
              {pct < 100 && (
                <div style={{ fontSize: 12, color: 'var(--orange, #E06000)', marginTop: 4 }}>
                  La mise en collecte sera refusée tant que cette langue n'est pas complète.
                </div>
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
              Seulement les manquants
            </label>
            <input
              className="form-input"
              style={{ width: 220, fontSize: 13 }}
              placeholder="Rechercher un texte…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {visibleGroups.length === 0 && (
            <div style={{ color: 'var(--gray-500)', fontSize: 13, padding: 16 }}>
              {onlyMissing ? 'Tout est traduit.' : 'Aucun texte ne correspond.'}
            </div>
          )}

          {visibleGroups.map((g) => (
            <div key={g.group} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--gray-500)', margin: '0 0 6px' }}>
                {g.group}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ fontSize: 11, color: 'var(--gray-500)', textAlign: 'left' }}>
                    <th style={{ width: '22%', padding: '4px 8px', fontWeight: 600 }}>Élément</th>
                    <th style={{ width: '39%', padding: '4px 8px', fontWeight: 600 }}>{LANGUAGE_NAMES[defaultLang] || defaultLang}</th>
                    <th style={{ width: '39%', padding: '4px 8px', fontWeight: 600 }}>{LANGUAGE_NAMES[activeLang] || activeLang}</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((e) => (
                    <TranslationRow key={e.key} entry={e} value={dict[e.key] || ''} onChange={(v) => setTranslation(e.key, v)} />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {dirty && (
        <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--gray-200)', padding: '10px 0', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-600)', alignSelf: 'center' }}>Modifications non enregistrées</span>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      )}
    </div>
  )
}

function TranslationRow({ entry, value, onChange }) {
  const missing = !value.trim()
  return (
    <tr style={{ borderTop: '1px solid var(--gray-100)', verticalAlign: 'top' }}>
      <td style={{ padding: '8px', fontSize: 12.5, color: 'var(--gray-700)' }}>
        {entry.label}
        {entry.html && (
          <span title="Ce texte contient de la mise en forme (HTML). Conservez les balises dans la traduction." style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', border: '1px solid var(--gray-300)', borderRadius: 4, padding: '0 4px' }}>HTML</span>
        )}
      </td>
      <td style={{ padding: '8px', fontSize: 13, color: 'var(--gray-600)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {entry.html ? entry.original : displayText(entry.original)}
      </td>
      <td style={{ padding: '6px 8px' }}>
        <AutoTextarea
          value={value}
          onChange={onChange}
          style={{ borderColor: missing ? 'var(--orange, #E06000)' : undefined }}
          placeholder={missing ? 'À traduire' : ''}
        />
      </td>
    </tr>
  )
}

function AutoTextarea({ value, onChange, style, placeholder }) {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(34, el.scrollHeight)}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      className="form-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      style={{ width: '100%', fontSize: 13, resize: 'vertical', minHeight: 34, lineHeight: 1.4, ...style }}
    />
  )
}

// Analyse CSV minimale : « ; » ou « , », champs entre guillemets (doublés pour
// un guillemet littéral), retours à la ligne dans les champs.
function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else if (c === '"') inQ = true
    else if (c === sep) { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}
