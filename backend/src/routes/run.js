// ─── ROUTES PUBLIQUES PARTICIPANT ─────────────────────────────────────────────
// Aucune authentification requise — accessibles depuis le portail participant.

const { computeBlockOrder } = require('../lib/counterbalancing')

async function runRoutes(fastify) {
  const { prisma } = fastify

  // ── Récupérer une étude (portail public) ──────────────────────────────────
  fastify.get('/:studyId', { onRequest: [] }, async (req, reply) => {
    const { studyId } = req.params
    const { preview } = req.query // ?preview=1 pour le chercheur en mode prévisualisation

    const study = await prisma.study.findUnique({
      where: { id: studyId },
      select: {
        id: true,
        name: true,
        status: true,
        blocks: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            label: true,
            order: true,
            settings: true,
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                code: true,
                type: true,
                text: true,
                required: true,
                randomize: true,
                settings: true,
                choices:     { orderBy: { order: 'asc' }, select: { id: true, code: true, label: true, order: true, anchored: true, mediaUrl: true, mediaType: true } },
                matrixItems: { orderBy: { order: 'asc' }, select: { id: true, code: true, label: true, order: true, reversed: true, left: true, right: true } },
              },
            },
            sequenceSteps: {
              orderBy: { order: 'asc' },
              select: { id: true, type: true, order: true, settings: true },
            },
            stimulusFiles: {
              orderBy: { createdAt: 'asc' },
              select: { id: true, filename: true, originalName: true, mimetype: true, url: true, category: true },
            },
          },
        },
      },
    })

    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    // En mode normal : l'étude doit être en COLLECTING
    if (!preview && study.status !== 'COLLECTING') {
      return reply.status(403).send({
        error: 'Cette étude n\'est pas disponible pour le moment.',
        status: study.status,
      })
    }

    // En mode preview : simuler une assignation aléatoire pour le filtrage entre-sujets
    let previewBlockOrder = null
    let previewCondition = null
    if (preview) {
      try {
        const design = await prisma.experimentalDesign.findUnique({
          where: { studyId },
          include: { factors: { orderBy: { order: 'asc' }, include: { levels: { orderBy: { order: 'asc' } } } } },
        })
        if (design && design.factors.length > 0) {
          // Simuler une assignation aléatoire : un niveau par facteur between, ordre aléatoire pour within
          const betweenAssignments = []
          const withinOrder = []
          const conditionParts = []
          for (const factor of design.factors) {
            if (factor.levels.length === 0) continue
            const randomIdx = Math.floor(Math.random() * factor.levels.length)
            if (factor.type === 'BETWEEN') {
              betweenAssignments.push({ factorId: factor.id, levelId: factor.levels[randomIdx].id })
              conditionParts.push(`${factor.name} = ${factor.levels[randomIdx].name}`)
            } else if (factor.type === 'WITHIN') {
              // Shuffle les niveaux
              const shuffled = [...factor.levels]
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
              }
              withinOrder.push(...shuffled.map((l) => l.id))
              conditionParts.push(`${factor.name} : ${shuffled.map((l) => l.name).join(' → ')}`)
            }
          }
          const assignment = { betweenAssignments, withinOrder }
          previewBlockOrder = computeBlockOrder(study.blocks, assignment, design.factors)
          if (conditionParts.length > 0) previewCondition = conditionParts.join(' | ')
        }
      } catch (_) { /* si pas de design, on ne filtre rien */ }
    }

    return reply.send({ study, previewBlockOrder, previewCondition })
  })

  // ── Sauvegarder les réponses aux questions ────────────────────────────────
  fastify.post('/:studyId/responses/questions', { onRequest: [] }, async (req, reply) => {
    const { studyId } = req.params
    const { participantId, blockId, responses } = req.body

    if (!participantId || !blockId || !Array.isArray(responses)) {
      return reply.status(400).send({ error: 'participantId, blockId et responses requis.' })
    }

    const created = await Promise.all(
      responses.map((r) =>
        prisma.questionResponse.create({
          data: {
            participantId,
            studyId,
            blockId,
            questionCode: r.questionCode,
            value: r.value,
          },
        })
      )
    )

    return reply.status(201).send({ count: created.length })
  })
}

module.exports = runRoutes
