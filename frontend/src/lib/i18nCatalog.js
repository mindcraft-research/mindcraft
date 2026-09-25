// Catalogue des textes traduisibles d'une étude (multilingue).
//
// FICHIER PARTAGÉ : une copie identique existe dans
// frontend/src/lib/i18nCatalog.js (les deux applications sont construites
// séparément). Toute modification doit être reportée dans les deux.
// Syntaxe CommonJS pour être chargeable des deux côtés.
//
// Principe : les traductions sont stockées dans study.metadata.i18n :
//   { defaultLang: 'fr', languages: ['en'], translations: { en: { [clé]: texte } } }
// Chaque texte affiché au·à la participant·e a une clé stable (fondée sur les
// identifiants, pas sur les positions). Le runner reçoit l'étude déjà traduite
// par le serveur (applyTranslations) ; sans langue demandée, rien ne change.

const DEFAULT_LANG = 'fr'

const LANGUAGE_NAMES = {
  fr: 'Français', en: 'English', de: 'Deutsch', es: 'Español', it: 'Italiano',
  nl: 'Nederlands', pt: 'Português', ar: 'العربية', zh: '中文', ja: '日本語',
}

// Réglages de question affichés tels quels au participant (chaîne simple).
const QUESTION_SETTING_KEYS = {
  acceptLabel: 'Bouton « accepter »',
  refuseLabel: 'Bouton « refuser »',
  commentLabel: 'Libellé du commentaire',
  caption: 'Légende',
  alt: 'Texte alternatif',
  resultLabel: 'Libellé du résultat',
  resultUnit: 'Unité du résultat',
  description: 'Texte d’aide',
  unit: 'Unité',
  errorMsg: 'Message d’erreur',
  leftLabel: 'Libellé gauche',
  rightLabel: 'Libellé droit',
  labelLeft: 'Libellé gauche',
  labelRight: 'Libellé droit',
  placeholder: 'Texte indicatif',
  passage: 'Texte',
  wordBank: 'Banque de mots',
}
// Réglages de question sous forme de liste de chaînes.
const QUESTION_SETTING_LISTS = { pointLabels: 'Point', columnLabels: 'Colonne' }

const BLOCK_TYPE_LABELS = {
  WELCOME: 'Message d’accueil', INSTRUCTION: 'Instruction', QUESTION: 'Questionnaire',
  STIMULUS: 'Tâche', LOGIC: 'Logique', DEBRIEFING: 'Message de fin',
}
const STEP_TYPE_LABELS = {
  INSTRUCTION_PAGE: 'Page d’instruction', WAIT_KEY: 'Attente', FIXATION: 'Fixation',
  STIMULUS: 'Stimulus', RESPONSE_KEY: 'Réponse', FEEDBACK: 'Feedback', QUESTION: 'Question', ITI: 'ITI',
}

// ─── HTML : afficher/ré-envelopper ────────────────────────────────────────────
// Beaucoup de textes (énoncés de question) sont un simple paragraphe HTML
// « <p>…</p> ». On les présente sans balises et on ré-enveloppe la traduction.
const SIMPLE_P = /^\s*<p>([^<]*)<\/p>\s*$/i

function isHtml(s) { return /<[a-z][\s\S]*>/i.test(s || '') }
function isSimpleParagraph(s) { return SIMPLE_P.test(s || '') }
function displayText(s) {
  const m = SIMPLE_P.exec(s || '')
  return m ? m[1] : (s || '')
}
function wrapLike(original, translation) {
  if (isSimpleParagraph(original) && !isHtml(translation)) return `<p>${translation}</p>`
  return translation
}

// ─── Accès par chemin ────────────────────────────────────────────────────────
function getPath(obj, path) {
  let cur = obj
  for (const p of path) { if (cur == null) return undefined; cur = cur[p] }
  return cur
}
function setPath(obj, path, value) {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    if (cur[path[i]] == null) cur[path[i]] = typeof path[i + 1] === 'number' ? [] : {}
    cur = cur[path[i]]
  }
  cur[path[path.length - 1]] = value
}

// ─── Collecte ────────────────────────────────────────────────────────────────
// Retourne [{ key, group, groupOrder, label, path, original, html }] pour chaque
// texte non vide affiché au participant. `path` est le chemin dans l'objet
// `study` tel que reçu (blocks[i].questions[j]…), utilisé pour appliquer les
// traductions ; `key` est stable (identifiants).
function collectStrings(study) {
  const out = []
  const push = (key, group, groupOrder, label, path, original) => {
    if (typeof original !== 'string' || !original.trim()) return
    out.push({ key, group, groupOrder, label, path, original, html: isHtml(original) && !isSimpleParagraph(original) })
  }

  const blocks = [...(study.blocks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  blocks.forEach((b, bi) => {
    const bIdx = (study.blocks || []).indexOf(b)
    const bname = b.settings?.name || b.label || BLOCK_TYPE_LABELS[b.type] || b.type
    const group = `Bloc ${bi + 1} · ${bname}`
    const s = b.settings || {}
    const base = ['blocks', bIdx, 'settings']

    if (b.type === 'WELCOME' || b.type === 'INSTRUCTION' || b.type === 'DEBRIEFING') {
      push(`b:${b.id}:title`, group, bi, 'Titre', [...base, 'title'], s.title)
      push(`b:${b.id}:content`, group, bi, 'Contenu', [...base, 'content'], s.content)
      push(`b:${b.id}:buttonLabel`, group, bi, 'Bouton', [...base, 'buttonLabel'], s.buttonLabel)
    }

    if (b.type === 'QUESTION') {
      ;(b.questions || []).forEach((q, qi) => {
        const qname = q.code ? `Question ${q.code}` : `Question ${qi + 1}`
        const qbase = ['blocks', bIdx, 'questions', qi]
        push(`q:${q.id}:text`, group, bi, `${qname} — énoncé`, [...qbase, 'text'], q.text)
        ;(q.choices || []).forEach((c, ci) => {
          push(`q:${q.id}:c:${c.id || c.code}`, group, bi, `${qname} — choix « ${c.code || ci + 1} »`, [...qbase, 'choices', ci, 'label'], c.label)
        })
        ;(q.matrixItems || []).forEach((m, mi) => {
          const mid = m.id || m.code
          push(`q:${q.id}:m:${mid}:label`, group, bi, `${qname} — ligne « ${m.code || mi + 1} »`, [...qbase, 'matrixItems', mi, 'label'], m.label)
          push(`q:${q.id}:m:${mid}:left`, group, bi, `${qname} — ligne « ${m.code || mi + 1} », pôle gauche`, [...qbase, 'matrixItems', mi, 'left'], m.left)
          push(`q:${q.id}:m:${mid}:right`, group, bi, `${qname} — ligne « ${m.code || mi + 1} », pôle droit`, [...qbase, 'matrixItems', mi, 'right'], m.right)
        })
        const qs = q.settings || {}
        for (const [k, lbl] of Object.entries(QUESTION_SETTING_KEYS)) {
          push(`q:${q.id}:s:${k}`, group, bi, `${qname} — ${lbl}`, [...qbase, 'settings', k], qs[k])
        }
        for (const [k, lbl] of Object.entries(QUESTION_SETTING_LISTS)) {
          if (Array.isArray(qs[k])) qs[k].forEach((v, i) => {
            push(`q:${q.id}:s:${k}:${i}`, group, bi, `${qname} — ${lbl} ${i + 1}`, [...qbase, 'settings', k, i], v)
          })
        }
        if (Array.isArray(qs.zones)) qs.zones.forEach((z, i) => {
          push(`q:${q.id}:s:zones:${z.code || i}`, group, bi, `${qname} — zone « ${z.code || i + 1} »`, [...qbase, 'settings', 'zones', i, 'label'], z && z.label)
        })
        if (Array.isArray(qs.variables)) qs.variables.forEach((v, i) => {
          push(`q:${q.id}:s:variables:${v.code || i}:label`, group, bi, `${qname} — variable « ${v.code || i + 1} »`, [...qbase, 'settings', 'variables', i, 'label'], v && v.label)
          push(`q:${q.id}:s:variables:${v.code || i}:unit`, group, bi, `${qname} — variable « ${v.code || i + 1} », unité`, [...qbase, 'settings', 'variables', i, 'unit'], v && v.unit)
        })
        if (qs.subChoices && typeof qs.subChoices === 'object') {
          for (const [code, list] of Object.entries(qs.subChoices)) {
            if (!Array.isArray(list)) continue
            list.forEach((sc, i) => {
              const lab = sc && typeof sc === 'object' ? sc.label : sc
              const p = sc && typeof sc === 'object' ? [...qbase, 'settings', 'subChoices', code, i, 'label'] : [...qbase, 'settings', 'subChoices', code, i]
              push(`q:${q.id}:s:subChoices:${code}:${i}`, group, bi, `${qname} — sous-choix de « ${code} » n° ${i + 1}`, p, lab)
            })
          }
        }
      })
    }

    if (b.type === 'STIMULUS') {
      push(`b:${b.id}:completionButtonLabel`, group, bi, 'Bouton de fin de tâche', [...base, 'completionButtonLabel'], s.completionButtonLabel)
      ;(s.taskPhases || []).forEach((ph, pi) => {
        const pid = ph.id || pi
        const pname = ph.settings?.name || ph.type || `phase ${pi + 1}`
        push(`b:${b.id}:phase:${pid}:name`, group, bi, `Phase « ${pname} » — nom`, [...base, 'taskPhases', pi, 'settings', 'name'], ph.settings?.name)
        push(`b:${b.id}:phase:${pid}:text`, group, bi, `Phase « ${pname} » — texte`, [...base, 'taskPhases', pi, 'settings', 'text'], ph.settings?.text)
        push(`b:${b.id}:phase:${pid}:buttonLabel`, group, bi, `Phase « ${pname} » — bouton`, [...base, 'taskPhases', pi, 'settings', 'buttonLabel'], ph.settings?.buttonLabel)
      })
      ;(b.sequenceSteps || []).forEach((st, si) => {
        const sid = st.id || si
        const sname = STEP_TYPE_LABELS[st.type] || st.type
        const sbase = ['blocks', bIdx, 'sequenceSteps', si, 'settings']
        const ss = st.settings || {}
        for (const k of ['text', 'buttonLabel', 'correctText', 'incorrectText', 'timeoutText', 'leftLabel', 'rightLabel']) {
          push(`b:${b.id}:step:${sid}:${k}`, group, bi, `Étape « ${sname} » — ${k === 'text' ? 'texte' : k === 'buttonLabel' ? 'bouton' : k === 'correctText' ? 'feedback correct' : k === 'incorrectText' ? 'feedback incorrect' : k === 'timeoutText' ? 'feedback trop lent' : k === 'leftLabel' ? 'libellé gauche' : 'libellé droit'}`, [...sbase, k], ss[k])
        }
        if (Array.isArray(ss.choices)) ss.choices.forEach((c, ci) => {
          push(`b:${b.id}:step:${sid}:choice:${ci}`, group, bi, `Étape « ${sname} » — choix ${ci + 1}`, [...sbase, 'choices', ci, 'label'], c && c.label)
        })
      })
    }
  })

  const btn = study.metadata?.formatting?.buttons || {}
  const fmtGroup = 'Boutons de navigation (Mise en forme)'
  push('fmt:buttons:nextLabel', fmtGroup, 10000, 'Bouton « Suivant »', ['metadata', 'formatting', 'buttons', 'nextLabel'], btn.nextLabel)
  push('fmt:buttons:continueLabel', fmtGroup, 10000, 'Bouton « Continuer »', ['metadata', 'formatting', 'buttons', 'continueLabel'], btn.continueLabel)
  push('fmt:buttons:finishLabel', fmtGroup, 10000, 'Bouton « Terminer »', ['metadata', 'formatting', 'buttons', 'finishLabel'], btn.finishLabel)

  return out
}

// ─── Application ─────────────────────────────────────────────────────────────
// Retourne une copie de l'étude où chaque texte traduit remplace l'original.
// Sans langue, langue par défaut ou langue inconnue : l'étude est renvoyée
// telle quelle (aucune copie).
function applyTranslations(study, lang) {
  const i18n = study && study.metadata && study.metadata.i18n
  const def = (i18n && i18n.defaultLang) || DEFAULT_LANG
  if (!lang || !i18n || lang === def) return study
  const dict = i18n.translations && i18n.translations[lang]
  if (!dict) return study
  const out = JSON.parse(JSON.stringify(study))
  for (const e of collectStrings(out)) {
    const t = dict[e.key]
    if (typeof t === 'string' && t.trim()) setPath(out, e.path, wrapLike(e.original, t))
  }
  return out
}

// Langue effectivement servie pour une langue demandée.
function resolveLang(study, requested) {
  const i18n = study && study.metadata && study.metadata.i18n
  const def = (i18n && i18n.defaultLang) || DEFAULT_LANG
  if (!requested || !i18n) return def
  const langs = Array.isArray(i18n.languages) ? i18n.languages : []
  return requested === def || langs.includes(requested) ? requested : def
}

// ─── Complétude ──────────────────────────────────────────────────────────────
function completeness(study, lang) {
  const entries = collectStrings(study)
  const dict = (study.metadata && study.metadata.i18n && study.metadata.i18n.translations && study.metadata.i18n.translations[lang]) || {}
  const missing = entries.filter((e) => !(typeof dict[e.key] === 'string' && dict[e.key].trim()))
  return { total: entries.length, done: entries.length - missing.length, missing: missing.map((e) => e.key) }
}

module.exports = {
  DEFAULT_LANG, LANGUAGE_NAMES,
  collectStrings, applyTranslations, resolveLang, completeness,
  displayText, isHtml, isSimpleParagraph, wrapLike, getPath, setPath,
}
