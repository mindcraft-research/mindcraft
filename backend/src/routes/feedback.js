// SPDX-License-Identifier: AGPL-3.0-or-later
const { sendFeedbackReplyEmail, sendFeedbackNotificationEmail } = require('../lib/email')

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

const replySchema = {
  body: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string', minLength: 5, maxLength: 5000 },
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
      include: { user: { select: { id: true, username: true, email: true } } },
    })

    // Notification email à l'admin (non bloquant : un échec d'envoi ne doit
    // pas faire échouer la création du feedback côté utilisateur·rice).
    sendFeedbackNotificationEmail(feedback, feedback.user).catch((err) => {
      fastify.log.error({ err, feedbackId: feedback.id }, 'Failed to send feedback notification email')
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

  // ── Export CSV des feedbacks (admin) ──────────────────────────────────────
  // Query param `scope` :
  //   - 'all'      → tous les feedbacks
  //   - 'pending'  → uniquement les non traités (status OPEN ou SEEN)
  //                  RESOLVED est exclu (= déjà traité).
  fastify.get('/export', async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Accès réservé aux administrateurs.' })
    }

    const scope = req.query.scope === 'pending' ? 'pending' : 'all'
    const where = scope === 'pending' ? { status: { in: ['OPEN', 'SEEN'] } } : {}

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true, email: true } } },
    })

    // CSV avec séparateur point-virgule (compatible Excel FR par défaut)
    // et BOM UTF-8 pour que les accents s'affichent correctement à l'ouverture.
    const escapeCsv = (v) => {
      const s = String(v ?? '')
      if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const STATUS_FR = { OPEN: 'À traiter', SEEN: 'Vue', RESOLVED: 'Résolue' }
    const TYPE_FR = { BUG: 'Bug', SUGGESTION: 'Suggestion', FEATURE: 'Feature' }

    const headers = [
      'ID',
      'Date de création',
      'Type',
      'Statut',
      'Auteur·rice',
      'Email',
      'Page',
      'Message',
      'Réponse admin',
      'Date de réponse',
    ]

    const rows = feedbacks.map((f) => [
      f.id,
      f.createdAt.toISOString(),
      TYPE_FR[f.type] || f.type,
      STATUS_FR[f.status] || f.status,
      f.user?.username || '',
      f.user?.email || '',
      f.page || '',
      f.message,
      f.adminReply || '',
      f.repliedAt ? f.repliedAt.toISOString() : '',
    ])

    const csv = '﻿' + // BOM UTF-8 pour Excel
      [headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\r\n')

    const today = new Date().toISOString().slice(0, 10)
    const filename = `feedbacks-${scope === 'pending' ? 'a-traiter' : 'tous'}-${today}.csv`

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csv)
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

  // ── Répondre à un feedback (admin) ────────────────────────────────────────
  // Sauvegarde la réponse en DB + envoie un email à l'utilisateur via Resend.
  // Passe automatiquement le statut à RESOLVED (si pas déjà).
  fastify.post('/:id/reply', { schema: replySchema }, async (req, reply) => {
    const adminUser = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (adminUser.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Accès réservé aux administrateurs.' })
    }

    const { message } = req.body

    // Récupérer le feedback + l'utilisateur destinataire
    const feedback = await prisma.feedback.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, username: true, email: true } } },
    })
    if (!feedback) return reply.status(404).send({ error: 'Feedback introuvable.' })

    // Sauvegarder en DB et passer le statut à RESOLVED
    const updated = await prisma.feedback.update({
      where: { id: feedback.id },
      data: {
        adminReply: message,
        repliedAt: new Date(),
        status: 'RESOLVED',
      },
      include: { user: { select: { id: true, username: true, email: true } } },
    })

    // Envoyer l'email — ne bloque pas la réponse en cas d'échec d'envoi
    try {
      await sendFeedbackReplyEmail(
        feedback.user.email,
        feedback.user.username,
        feedback.type,
        feedback.message,
        message,
      )
    } catch (err) {
      fastify.log.error({ err, feedbackId: feedback.id }, 'Failed to send feedback reply email')
    }

    return reply.send(updated)
  })
}

module.exports = feedbackRoutes
