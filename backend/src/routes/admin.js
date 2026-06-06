// SPDX-License-Identifier: AGPL-3.0-or-later
'use strict'

const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { sendVerificationEmail } = require('../lib/email')

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
  /**
   * Normalise une chaîne d'institution / laboratoire pour le regroupement.
   *
   * Objectif : faire en sorte que « Université Rennes 2 », « Rennes 2 »
   * et « Univ. Rennes 2 » soient comptés comme une seule entrée au lieu
   * de trois. Sans cette normalisation, le tableau des institutions
   * affichait des variantes orthographiques de la même université comme
   * des établissements distincts.
   *
   * Opérations appliquées :
   *  1. trim + lowercase
   *  2. retire les diacritiques (université → universite)
   *  3. retire les préfixes « université », « univ. », « univ »
   *  4. collapse les espaces multiples
   *
   * Limite assumée : ne fusionne PAS « Université de Rennes » (= Rennes 1)
   * avec « Université Rennes 2 » — ce sont des établissements distincts.
   * On ne fusionne que les variantes orthographiques évidentes.
   */
  function normalizeInstitution(raw) {
    if (!raw) return ''
    return raw
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // retire accents
      .toLowerCase()
      .trim()
      .replace(/^(universite|univ\.?)\s+/i, '')           // strip préfixe
      .replace(/\s+/g, ' ')                               // collapse espaces
  }

  /**
   * Agrège un dict de chaînes brutes -> compte, en regroupant les
   * variantes orthographiques. Retourne un tableau d'entrées
   * { label, count, variants } où label est la variante la plus longue
   * rencontrée (typiquement la plus complète) et variants liste toutes
   * les orthographes brutes vues.
   */
  function aggregateWithVariants(rawCounts) {
    const groups = {} // normalized -> { label, count, variants: [{raw, count}] }
    for (const [raw, count] of Object.entries(rawCounts)) {
      const key = normalizeInstitution(raw)
      if (!key) continue
      if (!groups[key]) groups[key] = { label: raw, count: 0, variants: [] }
      groups[key].count += count
      groups[key].variants.push({ raw, count })
      // Choisit comme label la variante la plus longue (souvent la plus
      // complète : « Université Rennes 2 » plutôt que « Rennes 2 »)
      if (raw.length > groups[key].label.length) groups[key].label = raw
    }
    return Object.values(groups)
      .map(g => ({ label: g.label, count: g.count, variants: g.variants.length }))
      .sort((a, b) => b.count - a.count)
      .map(g => [g.label, g.count, g.variants])
  }

  fastify.get('/stats', { onRequest: [adminOnly] }, async (req, reply) => {
    const users = await prisma.user.findMany({
      select: { profile: true, role: true, emailVerified: true, twoFactorEnabled: true, createdAt: true },
    })

    const total = users.length
    const verified = users.filter(u => u.emailVerified).length
    const with2FA = users.filter(u => u.twoFactorEnabled).length
    const admins = users.filter(u => u.role === 'ADMIN').length

    // Stats institutionnelles — collecte brute, puis normalisation pour
    // fusionner les variantes orthographiques (cf. normalizeInstitution).
    const institutionsRaw = {}
    const laboratoriesRaw = {}
    const statuses = {}
    const disciplines = {}

    for (const u of users) {
      const p = typeof u.profile === 'string' ? JSON.parse(u.profile) : (u.profile || {})
      if (p.institution) institutionsRaw[p.institution] = (institutionsRaw[p.institution] || 0) + 1
      if (p.laboratory)  laboratoriesRaw[p.laboratory]  = (laboratoriesRaw[p.laboratory]  || 0) + 1
      if (p.status)      statuses[p.status]              = (statuses[p.status] || 0) + 1
      if (p.discipline)  disciplines[p.discipline]       = (disciplines[p.discipline] || 0) + 1
    }

    // Inscriptions par mois (12 derniers mois)
    const monthly = {}
    for (const u of users) {
      const key = new Date(u.createdAt).toISOString().slice(0, 7) // YYYY-MM
      monthly[key] = (monthly[key] || 0) + 1
    }

    // Nombre d'études créées sur la plateforme, en excluant les études de
    // démonstration (créées automatiquement à l'inscription par
    // createDemoStudy.js — leur projet parent est toujours nommé exactement
    // « Démo MindCraft »). Le filtre porte sur le nom exact du projet,
    // donc dans le cas (très improbable) où un·e utilisateur·rice crée
    // un projet qu'il/elle nomme exactement comme ça, ses études seraient
    // comptées comme démo et exclues. Acceptable pour la v1.
    const studiesCreated = await prisma.study.count({
      where: {
        project: { name: { not: 'Démo MindCraft' } },
      },
    })

    return reply.send({
      total,
      verified,
      with2FA,
      admins,
      studiesCreated,
      institutions: aggregateWithVariants(institutionsRaw),
      laboratories: aggregateWithVariants(laboratoriesRaw),
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

  // ── Renvoyer un email de vérification ─────────────────────────────────────
  // Si `userIds` est fourni : cible ces utilisateur·rice·s.
  // Si `all: true` est fourni : cible tou·te·s les utilisateur·rice·s
  //   dont l'email n'est pas encore vérifié.
  // Renvoie le nombre d'emails envoyés.
  fastify.post('/resend-verification', { onRequest: [adminOnly] }, async (req, reply) => {
    const { userIds, all } = req.body || {}

    let users
    if (all) {
      users = await prisma.user.findMany({
        where: { emailVerified: false },
        select: { id: true, email: true, username: true },
      })
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      users = await prisma.user.findMany({
        where: { id: { in: userIds }, emailVerified: false },
        select: { id: true, email: true, username: true },
      })
    } else {
      return reply.status(400).send({ error: 'Fournir userIds (tableau) ou all=true.' })
    }

    let sent = 0
    let failed = 0
    for (const u of users) {
      try {
        const verifyToken = crypto.randomBytes(32).toString('hex')
        await prisma.user.update({
          where: { id: u.id },
          data: {
            verificationToken: await bcrypt.hash(verifyToken, 10),
            verificationTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
        await sendVerificationEmail(u.email, u.username, verifyToken)
        sent++
      } catch (err) {
        fastify.log.error({ err, userId: u.id }, 'Failed to resend verification email')
        failed++
      }
    }

    return reply.send({
      sent, failed,
      total: users.length,
      message: `${sent} email(s) de vérification envoyé(s)${failed > 0 ? ` (${failed} échec(s))` : ''}.`,
    })
  })

  // ── Réinitialiser l'onboarding ─────────────────────────────────────────────
  fastify.post('/reset-onboarding', { onRequest: [adminOnly] }, async (req, reply) => {
    const { userIds } = req.body || {}
    const where = Array.isArray(userIds) && userIds.length > 0 ? { id: { in: userIds } } : {}
    const result = await prisma.user.updateMany({ where, data: { onboardingCompleted: false } })
    return reply.send({ count: result.count, message: `Onboarding réinitialisé pour ${result.count} utilisateur(s).` })
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
