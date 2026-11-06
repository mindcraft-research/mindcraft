// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── ANONYMISATION DES RÉPONSES LIBRES (onglet Export) ──────────────────────
// Le chercheur relit les réponses libres, MindCraft lui signale les passages
// suspects, il choisit ceux à masquer. Les masques s'appliquent ensuite aux
// réponses aux questions de tous les exports (routes/export.js), pas aux
// résultats de tâches externes ni aux essais ; la réponse d'origine reste en
// base. Réservé au propriétaire et aux éditeurs, comme les exports : la page
// montre les réponses brutes. Voir lib/anonymisation.js.

const { exigerAcces } = require('../lib/acces')
const { noterAuto } = require('../lib/notebook')
const { TYPES_LIBRES, ETIQUETTES, textesDe, suggestionsPour, masqueValide, variantesDe, resteASignaler } = require('../lib/anonymisation')

module.exports = async function anonymisationRoutes(fastify) {
  const { prisma } = fastify
  const acces = (req, reply) => exigerAcces(prisma, req, reply, req.params.id, { ecriture: true })

  // Questions libres de l'étude : { "blockId:code" → { code, texte, type, bloc } }.
  async function questionsLibres(studyId) {
    const blocs = await prisma.block.findMany({
      where: { studyId, type: 'QUESTION' },
      select: { id: true, label: true, order: true, settings: true, questions: { where: { type: { in: TYPES_LIBRES } }, select: { code: true, text: true, type: true, order: true }, orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    })
    const parCle = new Map()
    for (const b of blocs) {
      for (const q of b.questions) {
        if (!q.code) continue
        parCle.set(`${b.id}:${q.code}`, { code: q.code, texte: q.text, type: q.type, bloc: b.settings?.name || b.label || `Bloc ${(b.order ?? 0) + 1}` })
      }
    }
    return parCle
  }

  // Réponses libres de vrais participants (session allouée : pas les aperçus).
  async function reponsesLibres(studyId, parCle) {
    const sessions = await prisma.participantSession.findMany({ where: { studyId }, select: { participantId: true } })
    const vrais = new Set(sessions.map((s) => s.participantId))
    const codes = [...new Set([...parCle.values()].map((q) => q.code))]
    if (!codes.length) return []
    const brutes = await prisma.questionResponse.findMany({
      where: { studyId, questionCode: { in: codes } },
      select: { id: true, participantId: true, blockId: true, questionCode: true, value: true },
      orderBy: [{ participantId: 'asc' }, { createdAt: 'asc' }],
    })
    return brutes.filter((r) => vrais.has(r.participantId) && parCle.has(`${r.blockId}:${r.questionCode}`) && textesDe(r.value).length)
  }

  // ── GET /:id/anonymisation ────────────────────────────────────────────────
  // Questions libres, leurs réponses (textes bruts), les passages suspects et
  // les masques déjà posés.
  fastify.get('/:id/anonymisation', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!(await acces(req, reply))) return
    const studyId = req.params.id
    const parCle = await questionsLibres(studyId)
    const reponses = await reponsesLibres(studyId, parCle)
    const masquages = await prisma.masquage.findMany({ where: { studyId }, select: { responseId: true, texte: true, etiquette: true } })
    const masquesPar = new Map()
    for (const m of masquages) {
      if (!masquesPar.has(m.responseId)) masquesPar.set(m.responseId, [])
      masquesPar.get(m.responseId).push({ texte: m.texte, etiquette: m.etiquette })
    }
    return {
      etiquettes: ETIQUETTES,
      questions: [...parCle.entries()].map(([cle, q]) => ({ cle, ...q })),
      reponses: reponses.map((r) => ({
        id: r.id,
        participantId: r.participantId,
        cle: `${r.blockId}:${r.questionCode}`,
        textes: textesDe(r.value),
        suggestions: suggestionsPour(r.value),
        masques: masquesPar.get(r.id) || [],
        aSignaler: resteASignaler(r.value, masquesPar.get(r.id) || []),
      })),
    }
  })

  // ── PUT /:id/anonymisation/:responseId ────────────────────────────────────
  // Remplace les masques d'une réponse. Corps : { masques: [{ texte, etiquette }] }.
  fastify.put('/:id/anonymisation/:responseId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!(await acces(req, reply))) return
    const studyId = req.params.id
    const r = await prisma.questionResponse.findFirst({ where: { id: String(req.params.responseId), studyId } })
    if (!r) return reply.status(404).send({ error: 'Réponse introuvable.' })
    const masques = Array.isArray(req.body?.masques) ? req.body.masques : null
    if (!masques || masques.length > 100) return reply.status(400).send({ error: 'masques : liste attendue (100 au plus).' })
    const uniques = new Map()
    for (const m of masques) {
      if (!masqueValide(r.value, m)) return reply.status(400).send({ error: `Passage ou étiquette invalide : « ${String(m?.texte ?? '').slice(0, 40)} ».` })
      uniques.set(m.texte, m.etiquette)
    }
    await prisma.$transaction([
      prisma.masquage.deleteMany({ where: { responseId: r.id } }),
      prisma.masquage.createMany({
        data: [...uniques.entries()].map(([texte, etiquette]) => ({ studyId, participantId: r.participantId, responseId: r.id, texte, etiquette, authorId: req.user.id })),
      }),
    ])
    return { masques: [...uniques.entries()].map(([texte, etiquette]) => ({ texte, etiquette })) }
  })

  // ── POST /:id/anonymisation/partout ───────────────────────────────────────
  // Masque un passage dans TOUTES les réponses libres où il apparaît
  // (ex. le nom d'une entreprise cité par plusieurs participants), quelle que
  // soit sa casse (« paul durand » pour « Paul Durand »). Ne couvre que les
  // réponses déjà reçues : les suivantes sont à vérifier à leur tour.
  // Corps : { texte, etiquette }. Renvoie le nombre de réponses concernées.
  fastify.post('/:id/anonymisation/partout', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!(await acces(req, reply))) return
    const studyId = req.params.id
    const { texte, etiquette } = req.body || {}
    const parCle = await questionsLibres(studyId)
    const cibles = (await reponsesLibres(studyId, parCle))
      .map((r) => ({ r, variantes: variantesDe(r.value, texte).filter((v) => masqueValide(r.value, { texte: v, etiquette })) }))
      .filter((c) => c.variantes.length)
    if (!cibles.length) return reply.status(400).send({ error: 'Passage introuvable dans les réponses, ou étiquette invalide.' })
    await prisma.$transaction([
      prisma.masquage.deleteMany({ where: { studyId, texte: { in: [...new Set(cibles.flatMap((c) => c.variantes))] }, responseId: { in: cibles.map((c) => c.r.id) } } }),
      prisma.masquage.createMany({
        data: cibles.flatMap(({ r, variantes }) => variantes.map((v) => ({ studyId, participantId: r.participantId, responseId: r.id, texte: v, etiquette, authorId: req.user.id }))),
      }),
    ])
    return { reponses: cibles.length, ids: cibles.map((c) => c.r.id) }
  })

  // ── POST /:id/anonymisation/valider ───────────────────────────────────────
  // « J'ai terminé la vérification » : entrée dans le cahier de labo (trace
  // pour le comité d'éthique ou le DPO). Le contenu ne cite AUCUN passage
  // masqué : il ne doit pas réintroduire ce qu'on vient de retirer.
  fastify.post('/:id/anonymisation/valider', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    if (!(await acces(req, reply))) return
    const studyId = req.params.id
    const parCle = await questionsLibres(studyId)
    const reponses = await reponsesLibres(studyId, parCle)
    const masquages = await prisma.masquage.findMany({ where: { studyId }, select: { responseId: true, texte: true, etiquette: true } })
    const etude = await prisma.study.findUnique({ where: { id: studyId }, select: { status: true } })
    // Le cahier dit ce que MindCraft sait : le nombre de réponses et de masques,
    // ce qui reste signalé. Pas « relues » : rien ne prouve qu'elles l'ont été.
    const restantes = reponses.filter((r) => resteASignaler(r.value, masquages.filter((m) => m.responseId === r.id))).length
    const parEtiquette = {}
    for (const m of masquages) parEtiquette[m.etiquette] = (parEtiquette[m.etiquette] || 0) + 1
    const nbReponsesMasquees = new Set(masquages.map((m) => m.responseId)).size
    const detail = Object.entries(parEtiquette).map(([e, n]) => `${e} × ${n}`).join(', ')
    const content = `Vérification des réponses libres déclarée terminée : ${reponses.length} réponse${reponses.length > 1 ? 's' : ''} libre${reponses.length > 1 ? 's' : ''} dans l'étude, `
      + `${masquages.length} passage${masquages.length > 1 ? 's' : ''} masqué${masquages.length > 1 ? 's' : ''} dans ${nbReponsesMasquees} réponse${nbReponsesMasquees > 1 ? 's' : ''}`
      + `${detail ? ` (${detail})` : ''}, ${restantes} réponse${restantes > 1 ? 's' : ''} avec un passage signalé non masqué. `
      + `${etude?.status === 'COLLECTING' ? 'Collecte encore en cours : les réponses reçues ensuite ne sont pas couvertes. ' : ''}`
      + `Les réponses aux questions sont exportées avec leurs étiquettes ; les résultats de tâches externes ne sont pas masqués ; les réponses d'origine restent sur le serveur.`
    await noterAuto(prisma, { studyId, userId: req.user.id, event: 'ANONYMISATION', content })
    return { ok: true, reponses: reponses.length, masquages: masquages.length, restantes }
  })
}
