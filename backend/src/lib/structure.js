// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── STRUCTURE D'UNE ÉTUDE (format mindcraft.study.structure) ─────────────────
// Fonctions pures (sans DB) : construction du JSON de structure exporté par
// GET /:id/export/json, et vérification de ses références internes.
// Spécification : docs/json-export-format.md.
//
// Depuis la version 1.1 du format, les blocs, questions, choix, lignes de
// matrice et étapes de séquence portent leur `id`. Plusieurs réglages y font
// référence (blocs d'un niveau de facteur, cibles des blocs-logiques, ordre
// personnalisé des questions, clés des traductions) : sans ces `id`, ces
// références ne pouvaient pas être résolues hors de l'instance d'origine.

const SCHEMA_VERSION = '1.1'

function structureEtude(study, { sessionCount = 0, maintenant = new Date() } = {}) {
  return {
    mindcraft: {
      export: {
        schemaVersion: SCHEMA_VERSION,
        format: 'mindcraft.study.structure',
        generatedAt: maintenant.toISOString(),
        generatedBy: 'MindCraft Platform',
        documentation: 'https://www.mindcraft-research.fr/docs',
        notes: 'Cet export contient la structure complète de l\'étude (blocs, questions, design, métadonnées). Il ne contient aucune donnée personnelle des participant·e·s. Il peut être archivé, partagé, réimporté dans MindCraft (Importer une étude, dans un projet) ou converti pour une autre plateforme (format documenté).',
      },
      study: {
        name: study.name,
        description: study.description,
        status: study.status,
        version: study.version,
        metadata: study.metadata || {},
        createdAt: study.createdAt,
        updatedAt: study.updatedAt,
        stats: {
          blockCount: study.blocks.length,
          questionCount: study.blocks.reduce((acc, b) => acc + (b.questions?.length || 0), 0),
          sessionCount,
        },
      },
      design: study.design ? {
        designType: study.design.designType,
        counterbalanceMethod: study.design.counterbalanceMethod,
        quotaMode: study.design.quotaMode,
        targetN: study.design.targetN,
        settings: study.design.settings || {},
        factors: study.design.factors.map((f) => ({
          name: f.name,
          type: f.type,
          order: f.order,
          levels: f.levels.map((l) => ({
            id: l.id,
            code: l.code,
            name: l.name,
            order: l.order,
            blockIds: l.blockIds || [],
          })),
        })),
      } : null,
      blocks: study.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        label: b.label,
        order: b.order,
        settings: b.settings || {},
        questions: (b.questions || []).map((q) => ({
          id: q.id,
          code: q.code,
          type: q.type,
          text: q.text,
          required: q.required,
          randomize: q.randomize,
          order: q.order,
          settings: q.settings || {},
          choices: (q.choices || []).map((c) => ({
            id: c.id,
            code: c.code,
            label: c.label,
            order: c.order,
            anchored: c.anchored,
            mediaUrl: c.mediaUrl,
            mediaType: c.mediaType,
          })),
          matrixItems: (q.matrixItems || []).map((m) => ({
            id: m.id,
            code: m.code,
            label: m.label,
            order: m.order,
            reversed: m.reversed,
            left: m.left,
            right: m.right,
          })),
        })),
        sequenceSteps: (b.sequenceSteps || []).map((s) => ({
          id: s.id,
          type: s.type,
          order: s.order,
          settings: s.settings || {},
        })),
        stimulusFiles: (b.stimulusFiles || []).map((f) => ({
          filename: f.filename,
          originalName: f.originalName,
          mimetype: f.mimetype,
          size: f.size,
          url: f.url,
          category: f.category,
        })),
      })),
    },
  }
}

// Références internes d'une structure qui ne pointent sur rien. Renvoie
// [{ ou, id }] (vide si tout est résolu). Les fichiers 1.0 n'ont pas d'`id` :
// toute référence y est donc signalée. Servira aussi à l'aperçu d'import.
function referencesManquantes(dump) {
  const m = dump?.mindcraft || {}
  const blocs = Array.isArray(m.blocks) ? m.blocks : []
  const idsBlocs = new Set(blocs.map((b) => b.id).filter(Boolean))
  const manquantes = []
  const verifier = (ensemble, id, ou) => { if (id && !ensemble.has(id)) manquantes.push({ ou, id }) }

  const idsNiveaux = new Set()
  for (const f of m.design?.factors || []) {
    for (const l of f.levels || []) {
      if (l?.id) idsNiveaux.add(l.id)
      for (const bid of Array.isArray(l.blockIds) ? l.blockIds : []) {
        verifier(idsBlocs, bid, `design : niveau « ${l.code || l.name} » du facteur « ${f.name} »`)
      }
    }
  }

  const idsQuestions = new Set()
  const parQuestion = new Map() // id → { choix, lignes } (id ou code acceptés)
  const parBloc = new Map()     // id → étapes (id ou position)
  for (const b of blocs) {
    const nom = b.label || b.settings?.name || b.type
    const s = b.settings || {}
    if (b.type === 'LOGIC') {
      for (const r of Array.isArray(s.rules) ? s.rules : []) {
        verifier(idsBlocs, r.targetBlockId, `bloc-logique « ${nom} » : règle`)
        if (r?.type === 'CONDITION_ASSIGNMENT') verifier(idsNiveaux, r.levelId, `bloc-logique « ${nom} » : condition expérimentale`)
      }
      verifier(idsBlocs, s.defaultTargetBlockId, `bloc-logique « ${nom} » : cible par défaut`)
    }
    const qs = b.questions || []
    const idsQBloc = new Set(qs.map((q) => q.id).filter(Boolean))
    for (const qid of Array.isArray(s._questionOrder) ? s._questionOrder : []) verifier(idsQBloc, qid, `bloc « ${nom} » : ordre des questions`)
    for (const q of qs) {
      if (q.id) idsQuestions.add(q.id)
      parQuestion.set(q.id, {
        choix: new Set((q.choices || []).flatMap((c) => [c.id, c.code]).filter(Boolean)),
        lignes: new Set((q.matrixItems || []).flatMap((it) => [it.id, it.code]).filter(Boolean)),
      })
    }
    parBloc.set(b.id, new Set((b.sequenceSteps || []).flatMap((st, i) => [st.id, String(i)]).filter(Boolean)))
  }

  // Clés des traductions (lib/i18nCatalog.js) : « b:<bloc>:… », « q:<question>:… ».
  const traductions = m.study?.metadata?.i18n?.translations || {}
  const clesVues = new Set()
  for (const dict of Object.values(traductions)) {
    for (const cle of Object.keys(dict || {})) {
      if (clesVues.has(cle)) continue
      clesVues.add(cle)
      const p = cle.split(':')
      const ou = `traduction « ${cle} »`
      if (p[0] === 'b') {
        verifier(idsBlocs, p[1], ou)
        if (p[2] === 'step' && idsBlocs.has(p[1])) verifier(parBloc.get(p[1]), p[3], ou)
      } else if (p[0] === 'q') {
        verifier(idsQuestions, p[1], ou)
        const q = parQuestion.get(p[1])
        if (q && p[2] === 'c') verifier(q.choix, p[3], ou)
        if (q && p[2] === 'm') verifier(q.lignes, p[3], ou)
      }
    }
  }
  return manquantes
}

module.exports = { SCHEMA_VERSION, structureEtude, referencesManquantes }
