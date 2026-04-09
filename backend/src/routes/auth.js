const bcrypt = require('bcrypt')
const crypto = require('crypto')

// ─── SCHÉMAS DE VALIDATION ────────────────────────────────────────────────────

const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 30 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
    },
  },
}

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
}

const forgotPasswordSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
    },
  },
}

const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: { type: 'string' },
      password: { type: 'string', minLength: 8 },
    },
  },
}

// ─── PLUGIN ROUTES ────────────────────────────────────────────────────────────

async function authRoutes(fastify) {
  const { prisma } = fastify

  // ── Inscription ────────────────────────────────────────────────────────────
  fastify.post('/register', { schema: registerSchema }, async (req, reply) => {
    const { username, email, password } = req.body

    // Vérifier si l'email ou le username existe déjà
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })

    if (existing) {
      const field = existing.email === email ? 'email' : 'nom d\'utilisateur'
      return reply.status(400).send({ error: `Cet ${field} est déjà utilisé.` })
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword },
      select: { id: true, username: true, email: true, createdAt: true },
    })

    // Générer les tokens
    const { accessToken, refreshToken } = generateTokens(fastify, user)
    setRefreshTokenCookie(reply, refreshToken)

    // Deploy demo study for new user
    try {
      const { createDemoStudy } = require('../lib/createDemoStudy')
      await createDemoStudy(prisma, user.id)
    } catch (err) {
      fastify.log.error({ msg: 'Failed to create demo study', err: err.message })
      // Don't block registration if demo creation fails
    }

    return reply.status(201).send({ user, accessToken })
  })

  // ── Connexion ──────────────────────────────────────────────────────────────
  fastify.post('/login', { schema: loginSchema }, async (req, reply) => {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.status(401).send({ error: 'Email ou mot de passe incorrect.' })
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      // Generate a temporary token (short-lived, 5 min)
      const tempToken = fastify.jwt.sign(
        { id: user.id, purpose: '2fa' },
        { expiresIn: '5m' }
      )
      return reply.send({
        requiresTwoFactor: true,
        tempToken,
      })
    }

    const { accessToken, refreshToken } = generateTokens(fastify, user)
    setRefreshTokenCookie(reply, refreshToken)

    return reply.send({
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
    })
  })

  // ── Vérifier le code 2FA lors du login ────────────────────────────────────
  fastify.post('/2fa/login-verify', async (req, reply) => {
    const { authenticator } = require('otplib')
    const { tempToken, code } = req.body

    if (!tempToken || !code) {
      return reply.status(400).send({ error: 'Token temporaire et code requis.' })
    }

    let payload
    try {
      payload = fastify.jwt.verify(tempToken)
    } catch {
      return reply.status(401).send({ error: 'Token expiré ou invalide. Reconnectez-vous.' })
    }

    if (payload.purpose !== '2fa') {
      return reply.status(401).send({ error: 'Token invalide.' })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user?.twoFactorSecret) {
      return reply.status(400).send({ error: 'Configuration 2FA introuvable.' })
    }

    const isValid = authenticator.check(String(code), user.twoFactorSecret)
    if (!isValid) {
      return reply.status(400).send({ error: 'Code invalide. Réessayez.' })
    }

    const { accessToken, refreshToken } = generateTokens(fastify, user)
    setRefreshTokenCookie(reply, refreshToken)

    return reply.send({
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
    })
  })

  // ── Déconnexion ────────────────────────────────────────────────────────────
  fastify.post('/logout', async (req, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth' })
    return reply.send({ message: 'Déconnecté avec succès.' })
  })

  // ── Rafraîchir le token ────────────────────────────────────────────────────
  fastify.post('/refresh', async (req, reply) => {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return reply.status(401).send({ error: 'Token de rafraîchissement manquant.' })
    }

    try {
      const payload = fastify.jwt.verify(refreshToken)
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, username: true, email: true },
      })

      if (!user) return reply.status(401).send({ error: 'Utilisateur introuvable.' })

      const { accessToken, refreshToken: newRefresh } = generateTokens(fastify, user)
      setRefreshTokenCookie(reply, newRefresh)

      return reply.send({ accessToken })
    } catch {
      return reply.status(401).send({ error: 'Token invalide ou expiré.' })
    }
  })

  // ── Profil utilisateur connecté ────────────────────────────────────────────
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        onboardingCompleted: true,
        twoFactorEnabled: true,
        profile: true,
        createdAt: true,
        _count: { select: { ownedProjects: true } },
      },
    })

    if (!user) return reply.status(404).send({ error: 'Utilisateur introuvable.' })
    return reply.send({ user })
  })

  // ── Marquer l'onboarding comme terminé ─────────────────────────────────────
  fastify.patch('/onboarding/complete', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { onboardingCompleted: true },
    })
    return reply.send({ message: 'Onboarding terminé.' })
  })

  // ── Modifier le profil ────────────────────────────────────────────────────
  fastify.patch('/profile', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { username, email, profile } = req.body

    // Vérifier unicité
    if (username) {
      const existing = await prisma.user.findFirst({ where: { username, NOT: { id: req.user.id } } })
      if (existing) return reply.status(400).send({ error: 'Ce nom d\'utilisateur est déjà utilisé.' })
    }
    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: req.user.id } } })
      if (existing) return reply.status(400).send({ error: 'Cette adresse e-mail est déjà utilisée.' })
    }

    const data = {}
    if (username) data.username = username
    if (email) data.email = email
    if (profile !== undefined) data.profile = profile

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, username: true, email: true, onboardingCompleted: true, twoFactorEnabled: true, profile: true, createdAt: true },
    })

    return reply.send({ user })
  })

  // ── Changer le mot de passe ───────────────────────────────────────────────
  fastify.post('/change-password', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ error: 'Mot de passe actuel et nouveau requis.' })
    }
    if (newPassword.length < 8) {
      return reply.status(400).send({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return reply.status(400).send({ error: 'Mot de passe actuel incorrect.' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    })

    return reply.send({ message: 'Mot de passe modifié avec succès.' })
  })

  // ── Configurer la 2FA ─────────────────────────────────────────────────────
  fastify.post('/2fa/setup', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { authenticator } = require('otplib')
    const QRCode = require('qrcode')

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return reply.status(404).send({ error: 'Utilisateur introuvable.' })

    const secret = authenticator.generateSecret()

    // Stocker le secret (pas encore activé)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret },
    })

    const otpauthUrl = authenticator.keyuri(user.email, 'MindCraft', secret)
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    return reply.send({ qrCode, secret })
  })

  // ── Vérifier et activer la 2FA ────────────────────────────────────────────
  fastify.post('/2fa/verify', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { authenticator } = require('otplib')
    const { code } = req.body

    if (!code) return reply.status(400).send({ error: 'Code requis.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user?.twoFactorSecret) {
      return reply.status(400).send({ error: 'Aucune configuration 2FA en cours. Lancez d\'abord /2fa/setup.' })
    }

    const isValid = authenticator.check(String(code), user.twoFactorSecret)
    if (!isValid) {
      return reply.status(400).send({ error: 'Code invalide. Réessayez.' })
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: true },
    })

    return reply.send({ message: 'Double authentification activée avec succès.' })
  })

  // ── Désactiver la 2FA ─────────────────────────────────────────────────────
  fastify.post('/2fa/disable', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { password } = req.body

    if (!password) return reply.status(400).send({ error: 'Mot de passe requis pour désactiver la 2FA.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.status(400).send({ error: 'Mot de passe incorrect.' })
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    })

    return reply.send({ message: 'Double authentification désactivée.' })
  })

  // ── Mot de passe oublié ────────────────────────────────────────────────────
  fastify.post('/forgot-password', { schema: forgotPasswordSchema }, async (req, reply) => {
    const { email } = req.body

    // On répond toujours la même chose pour ne pas révéler les emails enregistrés
    const message = 'Si cet email est enregistré, un lien de réinitialisation a été envoyé.'

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.send({ message })

    // Générer un token de réinitialisation (valable 1h)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    // Stocker le token haché dans la base
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: await bcrypt.hash(resetToken, 10),
        resetTokenExpires: expiresAt,
      },
    })

    // TODO: Envoyer l'email avec Brevo (Phase suivante)
    // await sendResetEmail(email, resetToken)
    fastify.log.info(`[DEV] Token de réinitialisation pour ${email}: ${resetToken}`)

    return reply.send({ message })
  })

  // ── Réinitialisation du mot de passe ──────────────────────────────────────
  fastify.post('/reset-password', { schema: resetPasswordSchema }, async (req, reply) => {
    const { token, password } = req.body

    const user = await prisma.user.findFirst({
      where: { resetTokenExpires: { gt: new Date() } },
    })

    if (!user || !(await bcrypt.compare(token, user.resetToken || ''))) {
      return reply.status(400).send({ error: 'Token invalide ou expiré.' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    return reply.send({ message: 'Mot de passe réinitialisé avec succès.' })
  })
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

function generateTokens(fastify, user) {
  const payload = { id: user.id, username: user.username, email: user.email }

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })

  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  })

  return { accessToken, refreshToken }
}

function setRefreshTokenCookie(reply, token) {
  reply.setCookie('refreshToken', token, {
    httpOnly: true,      // Inaccessible depuis le JavaScript — sécurité RGPD
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 jours en secondes
  })
}

module.exports = authRoutes
