'use strict'

module.exports = async function adminRoutes(fastify) {
  const { prisma } = fastify

  // Middleware: only ADMIN users
  const adminOnly = async (req, reply) => {
    await fastify.authenticate(req, reply)
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } })
    if (!user || user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Accès réservé aux administrateurs.' })
    }
  }

  // ── Liste des utilisateurs ────────────────────────────────────────────────
  fastify.get('/users', { onRequest: [adminOnly] }, async (req, reply) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        onboardingCompleted: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { ownedProjects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ users })
  })

  // ── Stats profils utilisateurs ────────────────────────────────────────────
  fastify.get('/stats', { onRequest: [adminOnly] }, async (req, reply) => {
    const users = await prisma.user.findMany({
      select: { profile: true, role: true, emailVerified: true, twoFactorEnabled: true, createdAt: true },
    })

    const total = users.length
    const verified = users.filter(u => u.emailVerified).length
    const with2FA = users.filter(u => u.twoFactorEnabled).length
    const admins = users.filter(u => u.role === 'ADMIN').length

    // Stats institutionnelles
    const institutions = {}
    const laboratories = {}
    const statuses = {}
    const disciplines = {}

    for (const u of users) {
      const p = typeof u.profile === 'string' ? JSON.parse(u.profile) : (u.profile || {})
      if (p.institution) institutions[p.institution] = (institutions[p.institution] || 0) + 1
      if (p.laboratory) laboratories[p.laboratory] = (laboratories[p.laboratory] || 0) + 1
      if (p.status) statuses[p.status] = (statuses[p.status] || 0) + 1
      if (p.discipline) disciplines[p.discipline] = (disciplines[p.discipline] || 0) + 1
    }

    // Inscriptions par mois (12 derniers mois)
    const monthly = {}
    for (const u of users) {
      const key = new Date(u.createdAt).toISOString().slice(0, 7) // YYYY-MM
      monthly[key] = (monthly[key] || 0) + 1
    }

    return reply.send({
      total,
      verified,
      with2FA,
      admins,
      institutions: Object.entries(institutions).sort((a, b) => b[1] - a[1]),
      laboratories: Object.entries(laboratories).sort((a, b) => b[1] - a[1]),
      statuses: Object.entries(statuses).sort((a, b) => b[1] - a[1]),
      disciplines: Object.entries(disciplines).sort((a, b) => b[1] - a[1]),
      monthly: Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])),
    })
  })

  // ── Modifier le rôle d'un utilisateur ─────────────────────────────────────
  fastify.patch('/users/:userId/role', { onRequest: [adminOnly] }, async (req, reply) => {
    const { userId } = req.params
    const { role } = req.body
    if (!['USER', 'ADMIN'].includes(role)) {
      return reply.status(400).send({ error: 'Rôle invalide. Valeurs acceptées : USER, ADMIN.' })
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, email: true, role: true },
    })
    return reply.send({ user })
  })

  // ── Désactiver/réactiver un utilisateur ───────────────────────────────────
  fastify.patch('/users/:userId/status', { onRequest: [adminOnly] }, async (req, reply) => {
    const { userId } = req.params
    const { emailVerified } = req.body
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: !!emailVerified },
      select: { id: true, username: true, email: true, emailVerified: true },
    })
    return reply.send({ user })
  })

  // ── Supprimer un utilisateur ──────────────────────────────────────────────
  fastify.delete('/users/:userId', { onRequest: [adminOnly] }, async (req, reply) => {
    const { userId } = req.params
    // Prevent self-deletion
    if (userId === req.user.id) {
      return reply.status(400).send({ error: 'Vous ne pouvez pas supprimer votre propre compte.' })
    }
    await prisma.user.delete({ where: { id: userId } })
    return reply.send({ message: 'Utilisateur supprimé.' })
  })
}
