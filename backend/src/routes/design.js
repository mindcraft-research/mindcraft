// SPDX-License-Identifier: AGPL-3.0-or-later
const { allocateParticipant, computeBlockOrder, isStudyFull, generateLatinSquare, generateWilliamsDesign, shuffleRandomGroups } = require('../lib/counterbalancing')

async function designRoutes(fastify) {
  const { prisma } = fastify

  // ── Helper : include complet d'un design ──────────────────────────────────
  const designInclude = {
    factors: {
      orderBy: { order: 'asc' },
      include: { levels: { orderBy: { order: 'asc' } } },
    },
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ROUTES AUTHENTIFIÉES (chercheur)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Récupérer le design d'une étude ───────────────────────────────────────
  fastify.get('/:id/design', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const design = await prisma.experimentalDesign.findUnique({
      where: { studyId: req.params.id },
      include: designInclude,
    })
    if (!design) return reply.status(404).send({ error: 'Aucun design défini pour cette étude.' })
    return reply.send({ design })
  })

  // ── Créer un design ───────────────────────────────────────────────────────
  fastify.post('/:id/design', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params
    const { designType, counterbalanceMethod, quotaMode, targetN, settings } = req.body

    if (!designType) return reply.status(400).send({ error: 'designType requis.' })

    const study = await prisma.study.findUnique({ where: { id } })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const existing = await prisma.experimentalDesign.findUnique({ where: { studyId: id } })
    if (existing) return reply.status(409).send({ error: 'Un design existe déjà. Utilisez PUT pour le modifier.' })

    const design = await prisma.experimentalDesign.create({
      data: {
        designType,
        counterbalanceMethod: counterbalanceMethod || 'LATIN_SQUARE',
        quotaMode: quotaMode || 'STRICT',
        targetN: targetN || 30,
        settings: settings || {},
        studyId: id,
      },
      include: designInclude,
    })

    return reply.status(201).send({ design })
  })

  // ── Modifier un design ────────────────────────────────────────────────────
  fastify.put('/:id/design', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params
    const { designType, counterbalanceMethod, quotaMode, targetN, settings } = req.body

    const design = await prisma.experimentalDesign.findUnique({ where: { studyId: id } })
    if (!design) return reply.status(404).send({ error: 'Aucun design défini.' })

    const updated = await prisma.experimentalDesign.update({
      where: { studyId: id },
      data: {
        ...(designType && { designType }),
        ...(counterbalanceMethod && { counterbalanceMethod }),
        ...(quotaMode && { quotaMode }),
        ...(targetN !== undefined && { targetN }),
        ...(settings && { settings }),
      },
      include: designInclude,
    })

    return reply.send({ design: updated })
  })

  // ── Supprimer un design ───────────────────────────────────────────────────
  fastify.delete('/:id/design', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const design = await prisma.experimentalDesign.findUnique({ where: { studyId: req.params.id } })
    if (!design) return reply.status(404).send({ error: 'Aucun design défini.' })

    await prisma.experimentalDesign.delete({ where: { id: design.id } })
    return reply.send({ message: 'Design supprimé.' })
  })

  // ── Ajouter un facteur ────────────────────────────────────────────────────
  fastify.post('/:id/design/factors', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const design = await prisma.experimentalDesign.findUnique({ where: { studyId: req.params.id } })
    if (!design) return reply.status(404).send({ error: 'Aucun design défini.' })

    const { name, type } = req.body
    if (!name || !type) return reply.status(400).send({ error: 'name et type requis.' })
    if (!['BETWEEN', 'WITHIN'].includes(type)) return reply.status(400).send({ error: 'type doit être BETWEEN ou WITHIN.' })

    const lastFactor = await prisma.factor.findFirst({
      where: { designId: design.id },
      orderBy: { order: 'desc' },
    })

    const factor = await prisma.factor.create({
      data: {
        name,
        type,
        order: (lastFactor?.order ?? -1) + 1,
        designId: design.id,
      },
      include: { levels: true },
    })

    return reply.status(201).send({ factor })
  })

  // ── Modifier un facteur ───────────────────────────────────────────────────
  fastify.put('/:id/design/factors/:factorId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { factorId } = req.params
    const { name, type } = req.body

    const factor = await prisma.factor.update({
      where: { id: factorId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
      },
      include: { levels: { orderBy: { order: 'asc' } } },
    })

    return reply.send({ factor })
  })

  // ── Supprimer un facteur ──────────────────────────────────────────────────
  fastify.delete('/:id/design/factors/:factorId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await prisma.factor.delete({ where: { id: req.params.factorId } })
    return reply.send({ message: 'Facteur supprimé.' })
  })

  // ── Ajouter un niveau ─────────────────────────────────────────────────────
  fastify.post('/:id/design/factors/:factorId/levels', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { factorId } = req.params
    const { name, code, blockIds } = req.body

    if (!name || !code) return reply.status(400).send({ error: 'name et code requis.' })

    const lastLevel = await prisma.factorLevel.findFirst({
      where: { factorId },
      orderBy: { order: 'desc' },
    })

    const level = await prisma.factorLevel.create({
      data: {
        name,
        code,
        order: (lastLevel?.order ?? -1) + 1,
        blockIds: blockIds || [],
        factorId,
      },
    })

    return reply.status(201).send({ level })
  })

  // ── Modifier un niveau ────────────────────────────────────────────────────
  fastify.put('/:id/design/factors/:factorId/levels/:levelId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { levelId } = req.params
    const { name, code, blockIds } = req.body

    const level = await prisma.factorLevel.update({
      where: { id: levelId },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(blockIds !== undefined && { blockIds }),
      },
    })

    return reply.send({ level })
  })

  // ── Supprimer un niveau ───────────────────────────────────────────────────
  fastify.delete('/:id/design/factors/:factorId/levels/:levelId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await prisma.factorLevel.delete({ where: { id: req.params.levelId } })
    return reply.send({ message: 'Niveau supprimé.' })
  })

  // ── Lister les sessions ───────────────────────────────────────────────────
  fastify.get('/:id/sessions', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params
    const { page = 1, limit = 50 } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const [sessions, total] = await Promise.all([
      prisma.participantSession.findMany({
        where: { studyId: id },
        include: { conditionAssignments: { include: { factorLevel: true } } },
        orderBy: { allocatedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.participantSession.count({ where: { studyId: id } }),
    ])

    return reply.send({ sessions, total, page: Number(page), limit: Number(limit) })
  })

  // ── Stats de recrutement (compteurs + objectif + progression) ─────────────
  // Utilisé par l'onglet Design (section « Taille d'échantillon ») pour
  // afficher en temps réel : nombre de participants ayant commencé, ayant
  // terminé, taux de complétion, et progression vers l'objectif (targetN).
  fastify.get('/:id/recruitment', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params

    const [statusGroups, design] = await Promise.all([
      prisma.participantSession.groupBy({
        by: ['status'],
        where: { studyId: id },
        _count: true,
      }),
      prisma.experimentalDesign.findUnique({
        where: { studyId: id },
        select: { targetN: true, designType: true },
      }),
    ])

    const counts = { ALLOCATED: 0, IN_PROGRESS: 0, COMPLETED: 0, ABANDONED: 0, EXCLUDED: 0 }
    for (const g of statusGroups) counts[g.status] = g._count

    // « Commencé » = a au moins atteint le portail d'allocation : on cumule
    // tous les statuts non vides à l'exception d'EXCLUDED (admin a marqué
    // la session comme à exclure des analyses).
    const started   = counts.ALLOCATED + counts.IN_PROGRESS + counts.COMPLETED + counts.ABANDONED
    const completed = counts.COMPLETED
    const targetN   = design?.targetN ?? null

    return reply.send({
      started,
      completed,
      completionRate: started > 0 ? completed / started : null,
      targetN,
      progress: targetN && targetN > 0 ? Math.min(completed / targetN, 1) : null,
      byStatus: counts,
    })
  })

  // ── Prévisualiser la matrice du design ────────────────────────────────────
  fastify.get('/:id/design/preview', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const design = await prisma.experimentalDesign.findUnique({
      where: { studyId: req.params.id },
      include: designInclude,
    })
    if (!design) return reply.status(404).send({ error: 'Aucun design défini.' })

    const withinFactors = design.factors.filter((f) => f.type === 'WITHIN')
    const betweenFactors = design.factors.filter((f) => f.type === 'BETWEEN')

    let sequences = []
    if (withinFactors.length > 0) {
      const k = withinFactors[0].levels.length
      switch (design.counterbalanceMethod) {
        case 'WILLIAMS':
          sequences = generateWilliamsDesign(k).map((seq) =>
            seq.map((i) => withinFactors[0].levels[i]?.name || `?`)
          )
          break
        case 'RANDOM':
          sequences = [withinFactors[0].levels.map((l) => l.name)]
          break
        default:
          sequences = generateLatinSquare(k).map((seq) =>
            seq.map((i) => withinFactors[0].levels[i]?.name || `?`)
          )
      }
    }

    // Comptage des sessions par cellule between
    const sessions = await prisma.participantSession.findMany({
      where: { studyId: req.params.id, status: { not: 'EXCLUDED' } },
      include: { conditionAssignments: true },
    })

    return reply.send({
      design,
      sequences,
      sessionCount: sessions.length,
      isFull: isStudyFull(design, design.factors, sessions),
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // ROUTES NON AUTHENTIFIÉES (participant)
  // ══════════════════════════════════════════════════════════════════════════

  // ── Allouer un participant ────────────────────────────────────────────────
  fastify.post('/:id/sessions/allocate', { onRequest: [] }, async (req, reply) => {
    const { id } = req.params
    const { participantId, metadata } = req.body

    if (!participantId) return reply.status(400).send({ error: 'participantId requis.' })

    // Vérifier si le participant a déjà une session
    const existingSession = await prisma.participantSession.findUnique({
      where: { studyId_participantId: { studyId: id, participantId } },
      include: { conditionAssignments: { include: { factorLevel: true } } },
    })
    if (existingSession) {
      return reply.send({ session: existingSession, existing: true })
    }

    // Charger le design
    const design = await prisma.experimentalDesign.findUnique({
      where: { studyId: id },
      include: designInclude,
    })

    if (!design) {
      // Pas de design — créer une session simple sans condition.
      //
      // On calcule quand même un blockOrder pour appliquer la randomisation
      // inter-blocs (settings.randomGroup) côté serveur, à la création de
      // la session. Sans ça, le shuffle randomGroup s'exécuterait côté
      // frontend à chaque render — d'où les symptômes utilisateur·rice
      // « le même bloc revient plusieurs fois, certains manquent, le
      // suivant est déjà rempli » (issue : reshuffle perpétuel).
      const blocks = await prisma.block.findMany({
        where: { studyId: id },
        orderBy: { order: 'asc' },
        select: { id: true, settings: true },
      })
      const naturalOrder = blocks.map((b) => b.id)
      const blockOrder = shuffleRandomGroups(naturalOrder, blocks)

      const session = await prisma.participantSession.create({
        data: {
          participantId,
          studyId: id,
          counterbalanceIndex: 0,
          blockOrder,
          metadata: metadata || {},
        },
        include: { conditionAssignments: { include: { factorLevel: true } } },
      })
      return reply.status(201).send({ session })
    }

    // Transaction sérialisable pour éviter les conditions de course
    const MAX_RETRIES = 3
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const session = await prisma.$transaction(async (tx) => {
          // Charger toutes les sessions existantes
          const existingSessions = await tx.participantSession.findMany({
            where: { studyId: id },
            include: { conditionAssignments: true },
          })

          // Algorithme d'allocation
          const result = allocateParticipant(design, design.factors, existingSessions)
          if (result.full) {
            throw new Error('STUDY_FULL')
          }

          // Charger les blocs pour calculer l'ordre
          const blocks = await tx.block.findMany({
            where: { studyId: id },
            orderBy: { order: 'asc' },
          })

          // 1) ordre déterminé par le design expérimental (between/within)
          // 2) randomisation des groupes inter-blocs (settings.randomGroup)
          //    appliquée côté serveur pour persister l'ordre dans la session.
          //    Cf. note sur le bug de reshuffle perpétuel côté frontend.
          const designOrder = computeBlockOrder(blocks, result, design.factors)
          const blockOrder = shuffleRandomGroups(designOrder, blocks)

          // Créer la session
          const newSession = await tx.participantSession.create({
            data: {
              participantId,
              studyId: id,
              counterbalanceIndex: result.counterbalanceIndex,
              blockOrder,
              metadata: metadata || {},
              conditionAssignments: {
                create: [
                  ...result.betweenAssignments.map((a) => ({ factorLevelId: a.levelId })),
                  ...result.withinOrder.map((levelId) => ({ factorLevelId: levelId })),
                ],
              },
            },
            include: { conditionAssignments: { include: { factorLevel: true } } },
          })

          return newSession
        }, {
          isolationLevel: 'Serializable',
        })

        return reply.status(201).send({ session })
      } catch (err) {
        if (err.message === 'STUDY_FULL') {
          return reply.status(409).send({ full: true, error: 'L\'étude est pleine. Tous les quotas sont atteints.' })
        }
        // Erreur de sérialisation — réessayer
        if (err.code === 'P2034' && attempt < MAX_RETRIES - 1) continue
        throw err
      }
    }
  })

  // ── Mettre à jour une session ─────────────────────────────────────────────
  fastify.patch('/:id/sessions/:sessionId', { onRequest: [] }, async (req, reply) => {
    const { sessionId } = req.params
    const { status } = req.body

    if (!status) return reply.status(400).send({ error: 'status requis.' })
    if (!['IN_PROGRESS', 'COMPLETED', 'ABANDONED'].includes(status)) {
      return reply.status(400).send({ error: 'status invalide.' })
    }

    const data = { status }
    if (status === 'IN_PROGRESS') data.startedAt = new Date()
    if (status === 'COMPLETED') data.completedAt = new Date()

    const session = await prisma.participantSession.update({
      where: { id: sessionId },
      data,
      include: { conditionAssignments: { include: { factorLevel: true } } },
    })

    return reply.send({ session })
  })
}

module.exports = designRoutes
