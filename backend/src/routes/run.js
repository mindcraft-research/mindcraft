// ─── ROUTES PUBLIQUES PARTICIPANT ─────────────────────────────────────────────
// Aucune authentification requise — accessibles depuis le portail participant.

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

    return reply.send({ study })
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
