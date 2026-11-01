// SPDX-License-Identifier: AGPL-3.0-or-later
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail, sendEmailChangeEmail, sendEmailChangeNoticeEmail } = require('../lib/email')
// Brouillons de préenregistrement dont l'étude disparaît (les verrouillés sont conservés).
const { supprimerBrouillonsOrphelins } = require('./prereg')
const { supprimerDonneesParticipants, etudesDuCompte } = require('../lib/donneesParticipants')

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
    required: ['login', 'password'],
    properties: {
      login: { type: 'string', minLength: 1 },
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
    required: ['token', 'password', 'email'],
    properties: {
      token: { type: 'string' },
      password: { type: 'string', minLength: 8 },
      email: { type: 'string', format: 'email' },
    },
  },
}

// ─── PLUGIN ROUTES ────────────────────────────────────────────────────────────

async function authRoutes(fastify) {
  const { prisma } = fastify

  // ── Inscription ────────────────────────────────────────────────────────────
  // Rate limit calibré pour permettre une classe entière de s'inscrire depuis
  // le même wifi (même IP publique) sans se faire bloquer. La protection
  // anti-spam reste largement assurée — un bot n'essayerait pas 30 inscriptions
  // depuis la même IP sur une heure, il en essayerait des centaines.
  fastify.post('/register', { schema: registerSchema, config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (req, reply) => {
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

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: empreinteLien(verifyToken),
        verificationTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Send verification email
    await sendVerificationEmail(email, username, verifyToken)

    // Deploy demo study for new user
    try {
      const { createDemoStudy } = require('../lib/createDemoStudy')
      await createDemoStudy(prisma, user.id)
    } catch (err) {
      fastify.log.error({ msg: 'Failed to create demo study', err: err.message })
      // Don't block registration if demo creation fails
    }

    return reply.status(201).send({
      message: 'Compte créé ! Vérifiez votre boîte e-mail pour activer votre compte.',
      emailSent: true,
    })
  })

  // ── Connexion ──────────────────────────────────────────────────────────────
  // Rate limit calibré pour permettre une classe entière de se connecter
  // depuis le même wifi sans se faire bloquer. La protection contre les
  // attaques par force brute reste effective (un bot essayerait des milliers
  // de combinaisons par minute, pas 30 par quart d'heure).
  fastify.post('/login', { schema: loginSchema, config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { login, password } = req.body

    // Chercher par email ou par nom d'utilisateur
    const isEmail = login.includes('@')
    const user = isEmail
      ? await prisma.user.findUnique({ where: { email: login } })
      : await prisma.user.findUnique({ where: { username: login } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.status(401).send({ error: 'Identifiant ou mot de passe incorrect.' })
    }

    if (!user.emailVerified) {
      return reply.status(403).send({
        error: 'Veuillez vérifier votre adresse e-mail avant de vous connecter.',
        emailNotVerified: true,
        email: user.email,
      })
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      // Generate a temporary token (short-lived, 5 min)
      const tempToken = fastify.jwt.sign(
        { id: user.id, purpose: '2fa', typ: '2fa' },
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
      user: { id: user.id, username: user.username, email: user.email, role: user.role, onboardingCompleted: user.onboardingCompleted, twoFactorEnabled: user.twoFactorEnabled, profile: user.profile, createdAt: user.createdAt },
      accessToken,
    })
  })

  // ── Vérifier le code 2FA lors du login ────────────────────────────────────
  // Limite propre : 10 codes par tranche de 5 minutes, pour empêcher de
  // deviner le code à 6 chiffres pendant la validité du jeton temporaire.
  fastify.post('/2fa/login-verify', { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } }, async (req, reply) => {
    const otplib = require('otplib')
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

    const isValid = otplib.verifySync({ token: String(code), secret: user.twoFactorSecret })
    if (!isValid) {
      return reply.status(400).send({ error: 'Code invalide. Réessayez.' })
    }

    const { accessToken, refreshToken } = generateTokens(fastify, user)
    setRefreshTokenCookie(reply, refreshToken)

    return reply.send({
      user: { id: user.id, username: user.username, email: user.email, role: user.role, onboardingCompleted: user.onboardingCompleted, twoFactorEnabled: user.twoFactorEnabled, profile: user.profile, createdAt: user.createdAt },
      accessToken,
    })
  })

  // ── Déconnexion ────────────────────────────────────────────────────────────
  // Les jetons de rafraîchissement du compte cessent de fonctionner
  // (tokenVersion + 1) : la déconnexion vaut pour tous les appareils, au
  // plus tard à l'expiration du jeton d'accès en cours (15 min).
  fastify.post('/logout', async (req, reply) => {
    const refreshToken = req.cookies?.refreshToken
    if (refreshToken) {
      try {
        const payload = fastify.jwt.verify(refreshToken)
        if (payload.typ !== 'access' && payload.typ !== '2fa' && payload.purpose !== '2fa' && payload.id) {
          await prisma.user.updateMany({ where: { id: payload.id, tokenVersion: payload.tv ?? 0 }, data: { tokenVersion: { increment: 1 } } })
        }
      } catch { /* jeton expiré ou invalide : rien à révoquer */ }
    }
    reply.clearCookie('refreshToken', { path: '/api/auth' })
    return reply.send({ message: 'Déconnecté avec succès.' })
  })

  // ── Rafraîchir le token ────────────────────────────────────────────────────
  fastify.post('/refresh', async (req, reply) => {
    // Le cookie de rafraîchissement ne s'échange que depuis le site MindCraft.
    // Une page HTML déposée comme média (tâche externe) est servie par le
    // domaine de l'API : sans ce contrôle, elle pourrait demander une session
    // au nom de la personne qui l'ouvre. Un navigateur envoie toujours
    // l'en-tête Origin sur un POST ; un client sans navigateur n'a pas le
    // cookie d'un autre.
    const origineAutorisee = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
    if (req.headers.origin && req.headers.origin !== origineAutorisee) {
      return reply.status(403).send({ error: 'Origine non autorisée.' })
    }
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return reply.status(401).send({ error: 'Token de rafraîchissement manquant.' })
    }

    try {
      const payload = fastify.jwt.verify(refreshToken)
      // Seul un jeton de rafraîchissement est accepté ici (pas le jeton
      // temporaire de la 2FA, ni un jeton d'accès). Les jetons antérieurs,
      // sans `typ`, restent acceptés le temps qu'ils expirent (7 jours).
      if (payload.purpose === '2fa' || payload.typ === '2fa' || payload.typ === 'access') {
        return reply.status(401).send({ error: 'Token invalide ou expiré.' })
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, username: true, email: true, tokenVersion: true },
      })

      if (!user) return reply.status(401).send({ error: 'Utilisateur introuvable.' })
      // Déconnexion ou changement de mot de passe depuis l'émission du jeton.
      // Jetons émis avant cette version (sans `tv`) : version 0.
      if ((payload.tv ?? 0) !== user.tokenVersion) {
        reply.clearCookie('refreshToken', { path: '/api/auth' })
        return reply.status(401).send({ error: 'Session terminée. Veuillez vous reconnecter.' })
      }

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
        role: true,
        onboardingCompleted: true,
        twoFactorEnabled: true,
        profile: true,
        pendingEmail: true,
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

  // ── Vérifier l'adresse e-mail ───────────────────────────────────────────
  // Sert aussi à confirmer un changement d'adresse (pendingEmail).
  fastify.post('/verify-email', { config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { token } = req.body || {}
    if (!token || typeof token !== 'string') return reply.status(400).send({ error: 'Token requis.' })

    const valide = { verificationTokenExp: { gt: new Date() } }
    // Le lien est retrouvé par son empreinte. Liens envoyés avant ce
    // changement (empreinte bcrypt, valables 24 h) : comparés un par un.
    let user = await prisma.user.findFirst({ where: { verificationToken: empreinteLien(token), ...valide } })
    if (!user) {
      const anciens = await prisma.user.findMany({ where: { verificationToken: { startsWith: '$2' }, ...valide } })
      for (const u of anciens) {
        if (await bcrypt.compare(token, u.verificationToken)) { user = u; break }
      }
    }
    if (!user) return reply.status(400).send({ error: 'Lien de vérification invalide ou expiré.' })

    if (user.pendingEmail) {
      const prise = await prisma.user.findFirst({ where: { email: user.pendingEmail, NOT: { id: user.id } }, select: { id: true } })
      if (prise) {
        await prisma.user.update({ where: { id: user.id }, data: { pendingEmail: null, verificationToken: null, verificationTokenExp: null } })
        return reply.status(400).send({ error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' })
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { email: user.pendingEmail, emailVerified: true, pendingEmail: null, verificationToken: null, verificationTokenExp: null },
      })
      return reply.send({ message: 'Nouvelle adresse e-mail confirmée. Elle sert désormais à vous connecter et à recevoir les e-mails de MindCraft.', changementEmail: true })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null, verificationTokenExp: null },
    })
    sendWelcomeEmail(user.email, user.username) // fire-and-forget
    return reply.send({ message: 'Adresse e-mail vérifiée avec succès ! Vous pouvez maintenant vous connecter.' })
  })

  // ── Renvoyer l'e-mail de vérification ─────────────────────────────────────
  fastify.post('/resend-verification', async (req, reply) => {
    const { email } = req.body
    if (!email) return reply.status(400).send({ error: 'E-mail requis.' })

    const message = 'Si cette adresse est enregistrée, un nouveau lien de vérification a été envoyé.'

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.emailVerified) return reply.send({ message })

    // Rate limit: 1 email per hour
    if (user.verificationTokenExp && user.verificationTokenExp > new Date(Date.now() + 23 * 60 * 60 * 1000)) {
      return reply.status(429).send({ error: 'Veuillez attendre avant de renvoyer un e-mail de vérification.' })
    }

    const verifyToken = crypto.randomBytes(32).toString('hex')
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: empreinteLien(verifyToken),
        verificationTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await sendVerificationEmail(email, user.username, verifyToken)
    return reply.send({ message })
  })

  // ── Modifier le profil ────────────────────────────────────────────────────
  fastify.patch('/profile', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { username, email, profile, currentPassword } = req.body || {}

    const actuel = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!actuel) return reply.status(404).send({ error: 'Utilisateur introuvable.' })

    // Vérifier unicité
    if (username) {
      const existing = await prisma.user.findFirst({ where: { username, NOT: { id: req.user.id } } })
      if (existing) return reply.status(400).send({ error: 'Ce nom d\'utilisateur est déjà utilisé.' })
    }

    // Nouvelle adresse e-mail : mot de passe actuel exigé, puis confirmation
    // par le lien envoyé à la nouvelle adresse ; l'ancienne est prévenue.
    // L'adresse du compte ne change qu'au clic sur ce lien.
    const nouvelleAdresse = typeof email === 'string' && email.trim() && email.trim() !== actuel.email ? email.trim() : null
    if (nouvelleAdresse) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nouvelleAdresse) || nouvelleAdresse.length > 254) {
        return reply.status(400).send({ error: 'Adresse e-mail invalide.' })
      }
      if (!currentPassword) {
        return reply.status(400).send({ error: 'Pour changer d\'adresse e-mail, indiquez votre mot de passe actuel.', motDePasseRequis: true })
      }
      if (!(await bcrypt.compare(String(currentPassword), actuel.password))) {
        return reply.status(400).send({ error: 'Mot de passe actuel incorrect.', motDePasseRequis: true })
      }
      const existing = await prisma.user.findFirst({ where: { email: nouvelleAdresse, NOT: { id: req.user.id } } })
      if (existing) return reply.status(400).send({ error: 'Cette adresse e-mail est déjà utilisée.' })
    }

    const data = {}
    if (username) data.username = username
    if (profile !== undefined) data.profile = profile
    let lien = null
    if (nouvelleAdresse) {
      lien = crypto.randomBytes(32).toString('hex')
      data.pendingEmail = nouvelleAdresse
      data.verificationToken = empreinteLien(lien)
      data.verificationTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, username: true, email: true, pendingEmail: true, onboardingCompleted: true, twoFactorEnabled: true, profile: true, createdAt: true },
    })

    if (nouvelleAdresse) {
      await sendEmailChangeEmail(nouvelleAdresse, user.username, lien)
      sendEmailChangeNoticeEmail(actuel.email, user.username, nouvelleAdresse) // fire-and-forget
      return reply.send({ user, message: `Un lien de confirmation a été envoyé à ${nouvelleAdresse}. Votre adresse changera quand vous l'aurez ouvert (valable 24 heures).` })
    }

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

    // Les autres appareils sont déconnectés (tokenVersion + 1) ; cette session
    // reçoit de nouveaux jetons.
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    const misAJour = await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    })

    sendPasswordChangedEmail(user.email, user.username) // fire-and-forget

    const { accessToken, refreshToken } = generateTokens(fastify, misAJour)
    setRefreshTokenCookie(reply, refreshToken)
    return reply.send({ message: 'Mot de passe modifié avec succès.', accessToken })
  })

  // ── Configurer la 2FA ─────────────────────────────────────────────────────
  fastify.post('/2fa/setup', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const otplib = require('otplib')
    const QRCode = require('qrcode')

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return reply.status(404).send({ error: 'Utilisateur introuvable.' })

    const secret = otplib.generateSecret()

    // Stocker le secret (pas encore activé)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret },
    })

    const otpauthUrl = otplib.generateURI({ issuer: 'MindCraft', label: user.email, secret })
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    return reply.send({ qrCode, secret })
  })

  // ── Vérifier et activer la 2FA ────────────────────────────────────────────
  fastify.post('/2fa/verify', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const otplib = require('otplib')
    const { code } = req.body

    if (!code) return reply.status(400).send({ error: 'Code requis.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user?.twoFactorSecret) {
      return reply.status(400).send({ error: 'Aucune configuration 2FA en cours. Lancez d\'abord /2fa/setup.' })
    }

    const isValid = otplib.verifySync({ token: String(code), secret: user.twoFactorSecret })
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

  // ── Supprimer son compte ──────────────────────────────────────────────────
  fastify.post('/delete-account', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { password } = req.body
    if (!password) return reply.status(400).send({ error: 'Mot de passe requis.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.status(400).send({ error: 'Mot de passe incorrect.' })
    }

    // Compte, projets et études partent en cascade ; les données des
    // participants de ses études n'ont pas de lien : supprimées d'abord.
    await prisma.$transaction(async (tx) => {
      await supprimerDonneesParticipants(tx, { studyIds: await etudesDuCompte(tx, req.user.id) })
      await tx.user.delete({ where: { id: req.user.id } })
    }, { timeout: 120000 })
    await supprimerBrouillonsOrphelins(prisma)
    reply.clearCookie('refreshToken', { path: '/api/auth' })
    return reply.send({ message: 'Compte supprimé avec succès. Vos données ont été effacées, à l’exception des préenregistrements verrouillés, conservés pour rester vérifiables.' })
  })

  // ── Exporter ses données (RGPD Art. 20) ───────────────────────────────────
  fastify.get('/data-export', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, username: true, email: true, profile: true,
        createdAt: true, updatedAt: true,
        ownedProjects: {
          select: {
            id: true, name: true, description: true, createdAt: true,
            studies: { select: { id: true, name: true, status: true, createdAt: true } },
          },
        },
      },
    })

    const data = {
      exportedAt: new Date().toISOString(),
      purpose: 'RGPD Article 20 — Droit à la portabilité des données',
      user,
    }

    reply
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="mindcraft-data-export.json"`)
      .send(JSON.stringify(data, null, 2))
  })

  // ── Mot de passe oublié ────────────────────────────────────────────────────
  fastify.post('/forgot-password', { schema: forgotPasswordSchema, config: { rateLimit: { max: 3, timeWindow: '1 hour' } } }, async (req, reply) => {
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

    await sendPasswordResetEmail(email, user.username, resetToken)

    return reply.send({ message })
  })

  // ── Réinitialisation du mot de passe ──────────────────────────────────────
  fastify.post('/reset-password', { schema: resetPasswordSchema }, async (req, reply) => {
    const { token, password, email } = req.body

    const user = await prisma.user.findFirst({
      where: { email, resetTokenExpires: { gt: new Date() } },
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
        // Toutes les sessions ouvertes sont fermées.
        tokenVersion: { increment: 1 },
      },
    })

    return reply.send({ message: 'Mot de passe réinitialisé avec succès.' })
  })
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

// Chaque jeton porte son type (`typ`) : le jeton d'accès ouvre l'API, le
// jeton de rafraîchissement ne sert qu'à /refresh (cf. authenticate dans
// server.js).
// `tv` : version des jetons du compte (voir /logout et /refresh).
function generateTokens(fastify, user) {
  const payload = { id: user.id, username: user.username, email: user.email, tv: user.tokenVersion ?? 0 }

  const accessToken = fastify.jwt.sign({ ...payload, typ: 'access' }, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })

  const refreshToken = fastify.jwt.sign({ ...payload, typ: 'refresh' }, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  })

  return { accessToken, refreshToken }
}

// Lien envoyé par e-mail (vérification, changement d'adresse) : seule son
// empreinte est stockée, ce qui permet de retrouver le compte directement.
// Le lien est aléatoire (32 octets) : une empreinte rapide suffit.
function empreinteLien(lien) {
  return crypto.createHash('sha256').update(String(lien)).digest('hex')
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
