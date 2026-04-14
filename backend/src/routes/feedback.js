// ─── SCHÉMAS DE VALIDATION ────────────────────────────────────────────────────

const createSchema = {
  body: {
    type: 'object',
    required: ['type', 'message'],
    properties: {
      type: { type: 'string', enum: ['BUG', 'SUGGESTION', 'FEATURE'] },
      message: { type: 'string', minLength: 5, maxLength: 2000 },
      page: { type: 'string', maxLength: 200 },
    },
  },
}

// ─── PLUGIN ROUTES ────────────────────────────────────────────────────────────

async function feedbackRoutes(fastify) {
  const { prisma } = fastify

  // Toutes les routes nécessitent une authentification
  fastify.addHook('onRequest', fastify.authenticate)

  // ── Créer un feedback ─────────────────────────────────────────────────────
  fastify.post('/', { schema: createSchema }, async (req, reply) => {
    const { type, message, page } = req.body

    const feedback = await prisma.feedback.create({
      data: {
        type,
        message,
        page,
        userId: req.user.id,
      },
    })

    return reply.status(201).send(feedback)
  })

  // ── Lister mes feedbacks ──────────────────────────────────────────────────
  fastify.get('/mine', async (req, reply) => {
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return reply.send(feedbacks)
  })

  // ── Lister tous les feedbacks (admin) ─────────────────────────────────────
  fastify.get('/', async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Accès réservé aux administrateurs.' })
    }

    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, email: true } } },
    })

    return reply.send(feedbacks)
  })

  // ── Mettre à jour le statut (admin) ───────────────────────────────────────
  fastify.patch('/:id/status', async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Accès réservé aux administrateurs.' })
    }

    const { status } = req.body
    if (!['OPEN', 'SEEN', 'RESOLVED'].includes(status)) {
      return reply.status(400).send({ error: 'Statut invalide.' })
    }

    const feedback = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { status },
    })

    return reply.send(feedback)
  })
}

module.exports = feedbackRoutes
