const BLOCK_LABELS = {
  WELCOME: 'Accueil', INSTRUCTION: 'Instruction', QUESTION: 'Questionnaire',
  STIMULUS: 'Tâche', LOGIC: 'Logique', DEBRIEFING: 'Message de fin',
}

async function studyRoutes(fastify) {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)

  // ── Créer une étude ────────────────────────────────────────────────────────
  fastify.post('/', async (req, reply) => {
    const { projectId, name, description } = req.body
    const userId = req.user.id

    if (!name || !projectId) return reply.status(400).send({ error: 'Nom et projectId requis.' })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return reply.status(404).send({ error: 'Projet introuvable.' })

    const study = await prisma.study.create({
      data: { name, description, projectId },
    })

    // Snapshot initiale vide
    await prisma.studyVersion.create({
      data: { studyId: study.id, version: 1, snapshot: { blocks: [] } },
    })

    await logActivity(prisma, userId, projectId, 'STUDY_CREATED', `Étude "${name}" créée`)

    return reply.status(201).send({ study })
  })

  // ── Récupérer une étude avec ses blocs ────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params

    const study = await prisma.study.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                choices:     { orderBy: { order: 'asc' } },
                matrixItems: { orderBy: { order: 'asc' } },
                conditions:  true,
              },
            },
          },
        },
        project: { select: { id: true, name: true, ownerId: true } },
        design: {
          include: {
            factors: {
              orderBy: { order: 'asc' },
              include: { levels: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    })

    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })
    return reply.send({ study })
  })

  // ── Modifier les métadonnées d'une étude ─────────────────────────────────
  fastify.patch('/:id', async (req, reply) => {
    const { id } = req.params
    const { name, description, metadata } = req.body

    const study = await prisma.study.findUnique({ where: { id } })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const updated = await prisma.study.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(metadata !== undefined && { metadata }),
      },
    })

    return reply.send({ study: updated })
  })

  // ── Supprimer une étude ───────────────────────────────────────────────────
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    const study = await prisma.study.findUnique({
      where: { id },
      include: { project: true },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (study.project.ownerId !== userId) {
      return reply.status(403).send({ error: 'Seul le propriétaire peut supprimer cette étude.' })
    }

    await prisma.study.delete({ where: { id } })
    await logActivity(prisma, userId, study.projectId, 'STUDY_DELETED', `Étude "${study.name}" supprimée`)

    return reply.send({ message: 'Étude supprimée.' })
  })

  // ── Modifier le statut d'une étude ────────────────────────────────────────
  fastify.patch('/:id/status', async (req, reply) => {
    const { id } = req.params
    const { status } = req.body
    const userId = req.user.id

    const study = await prisma.study.findUnique({
      where: { id },
      include: { project: true },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const updated = await prisma.study.update({
      where: { id },
      data: { status },
    })

    await logActivity(prisma, userId, study.projectId, 'STUDY_STATUS_CHANGED', `Étude "${study.name}" → ${status}`)
    return reply.send({ study: updated })
  })

  // ── Ajouter un bloc ───────────────────────────────────────────────────────
  fastify.post('/:id/blocks', async (req, reply) => {
    const { id } = req.params
    const { type, settings } = req.body
    const userId = req.user.id

    const study = await prisma.study.findUnique({ where: { id } })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    // Calculer l'ordre (dernier + 1)
    const lastBlock = await prisma.block.findFirst({
      where: { studyId: id },
      orderBy: { order: 'desc' },
    })
    const order = (lastBlock?.order ?? -1) + 1

    const block = await prisma.block.create({
      data: { type, order, settings: settings || {}, studyId: id },
      include: { questions: true },
    })

    await saveVersion(prisma, id)
    await logActivity(prisma, userId, study.projectId, 'BLOCK_ADDED', `Bloc "${BLOCK_LABELS[type] || type}" ajouté`)

    return reply.status(201).send({ block })
  })

  // ── Modifier un bloc ──────────────────────────────────────────────────────
  fastify.put('/:id/blocks/:blockId', async (req, reply) => {
    const { blockId } = req.params
    const { settings, label } = req.body

    const block = await prisma.block.update({
      where: { id: blockId },
      data: {
        settings,
        ...(label !== undefined && { label }),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: true, matrixItems: true, conditions: true },
        },
      },
    })

    await saveVersion(prisma, req.params.id)
    return reply.send({ block })
  })

  // ── Supprimer un bloc ─────────────────────────────────────────────────────
  fastify.delete('/:id/blocks/:blockId', async (req, reply) => {
    const { id, blockId } = req.params
    const userId = req.user.id

    const block = await prisma.block.findUnique({
      where: { id: blockId },
      include: { study: { include: { project: true } } },
    })
    if (!block) return reply.status(404).send({ error: 'Bloc introuvable.' })

    await prisma.block.delete({ where: { id: blockId } })

    // Nettoyer les blockIds orphelins dans les niveaux de facteur
    try {
      const design = await prisma.experimentalDesign.findUnique({
        where: { studyId: id },
        include: { factors: { include: { levels: true } } },
      })
      if (design) {
        for (const factor of design.factors) {
          for (const level of factor.levels) {
            const bIds = Array.isArray(level.blockIds) ? level.blockIds : JSON.parse(level.blockIds || '[]')
            if (bIds.includes(blockId)) {
              await prisma.factorLevel.update({
                where: { id: level.id },
                data: { blockIds: bIds.filter((bid) => bid !== blockId) },
              })
            }
          }
        }
      }
    } catch { /* ne pas bloquer la suppression */ }

    // Réordonner les blocs restants
    const remaining = await prisma.block.findMany({
      where: { studyId: id },
      orderBy: { order: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      await prisma.block.update({ where: { id: remaining[i].id }, data: { order: i } })
    }

    await saveVersion(prisma, id)
    await logActivity(prisma, userId, block.study.projectId, 'BLOCK_DELETED', `Bloc "${BLOCK_LABELS[block.type] || block.type}" supprimé`)

    return reply.send({ message: 'Bloc supprimé.' })
  })

  // ── Réordonner les blocs ──────────────────────────────────────────────────
  fastify.put('/:id/blocks/reorder', async (req, reply) => {
    const { id } = req.params
    const { order } = req.body // Array d'ids dans le nouvel ordre

    if (!Array.isArray(order)) return reply.status(400).send({ error: 'order doit être un tableau.' })

    await Promise.all(
      order.map((blockId, index) =>
        prisma.block.update({ where: { id: blockId }, data: { order: index } })
      )
    )

    await saveVersion(prisma, id)
    return reply.send({ message: 'Ordre mis à jour.' })
  })

  // ── Ajouter une question ──────────────────────────────────────────────────
  fastify.post('/:id/blocks/:blockId/questions', async (req, reply) => {
    const { blockId } = req.params
    const { code, type, text, required, randomize, settings, choices, matrixItems } = req.body

    // Types sans code variable ni texte requis
    const NO_CODE_TYPES = ['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO', 'TIMING', 'META_INFO']
    const NO_TEXT_TYPES = ['IMAGE', 'AUDIO', 'VIDEO', 'TIMING', 'META_INFO']
    if (!type) return reply.status(400).send({ error: 'type requis.' })
    if (!NO_CODE_TYPES.includes(type) && !code) return reply.status(400).send({ error: 'code requis.' })
    if (!NO_TEXT_TYPES.includes(type) && !text) return reply.status(400).send({ error: 'text requis.' })

    const lastQ = await prisma.question.findFirst({
      where: { blockId },
      orderBy: { order: 'desc' },
    })
    const order = (lastQ?.order ?? -1) + 1

    const question = await prisma.question.create({
      data: {
        code: code || null,
        type,
        text: text || '',
        required: required ?? true,
        randomize: randomize ?? false,
        order,
        settings: settings || {},
        blockId,
        choices: choices ? {
          create: choices.map((c, i) => ({
            code: c.code, label: c.label, order: i,
            anchored: c.anchored || false,
            mediaUrl: c.mediaUrl || null,
            mediaType: c.mediaType || null,
          }))
        } : undefined,
        matrixItems: matrixItems ? {
          create: matrixItems.map((m, i) => ({
            code: m.code, label: m.label, order: i,
            reversed: m.reversed || false,
            left: m.left || null,
            right: m.right || null,
          }))
        } : undefined,
      },
      include: {
        choices:     { orderBy: { order: 'asc' } },
        matrixItems: { orderBy: { order: 'asc' } },
        conditions:  true,
      },
    })

    await saveVersion(prisma, req.params.id)
    return reply.status(201).send({ question })
  })

  // ── Réordonner les questions d'un bloc ───────────────────────────────────
  fastify.put('/:id/blocks/:blockId/reorder-questions', async (req, reply) => {
    const { order } = req.body
    if (!Array.isArray(order)) return reply.status(400).send({ error: 'order doit être un tableau.' })
    await Promise.all(
      order.map((questionId, index) =>
        prisma.question.update({ where: { id: questionId }, data: { order: index } })
      )
    )
    return reply.send({ ok: true })
  })

  // ── Modifier une question ─────────────────────────────────────────────────
  fastify.put('/:id/blocks/:blockId/questions/:questionId', async (req, reply) => {
    const { questionId } = req.params
    const { code, type, text, required, randomize, settings, choices, matrixItems } = req.body

    // Supprimer les anciens choix/items puis recréer
    await prisma.$transaction([
      prisma.choice.deleteMany({ where: { questionId } }),
      prisma.matrixItem.deleteMany({ where: { questionId } }),
    ])

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        code: code || null,
        type,
        text: text || '',
        required: required ?? true,
        randomize: randomize ?? false,
        settings: settings || {},
        choices: choices ? {
          create: choices.map((c, i) => ({
            code: c.code, label: c.label, order: i,
            anchored: c.anchored || false,
            mediaUrl: c.mediaUrl || null,
            mediaType: c.mediaType || null,
          }))
        } : undefined,
        matrixItems: matrixItems ? {
          create: matrixItems.map((m, i) => ({
            code: m.code, label: m.label, order: i,
            reversed: m.reversed || false,
            left: m.left || null,
            right: m.right || null,
          }))
        } : undefined,
      },
      include: {
        choices:     { orderBy: { order: 'asc' } },
        matrixItems: { orderBy: { order: 'asc' } },
        conditions:  true,
      },
    })

    await saveVersion(prisma, req.params.id)
    return reply.send({ question })
  })

  // ── Supprimer une question ────────────────────────────────────────────────
  fastify.delete('/:id/blocks/:blockId/questions/:questionId', async (req, reply) => {
    const { questionId } = req.params
    await prisma.question.delete({ where: { id: questionId } })
    await saveVersion(prisma, req.params.id)
    return reply.send({ message: 'Question supprimée.' })
  })
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

async function saveVersion(prisma, studyId) {
  try {
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { choices: true, matrixItems: true, conditions: true },
            },
          },
        },
      },
    })

    await prisma.study.update({
      where: { id: studyId },
      data: {
        version: { increment: 1 },
        versions: {
          create: { version: study.version + 1, snapshot: { blocks: study.blocks } },
        },
      },
    })
  } catch { /* ne pas bloquer */ }
}

async function logActivity(prisma, userId, projectId, action, details) {
  try {
    await prisma.activityLog.create({ data: { userId, projectId, action, details } })
  } catch { /* ne pas bloquer */ }
}

module.exports = studyRoutes
