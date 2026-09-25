// SPDX-License-Identifier: AGPL-3.0-or-later
require('dotenv').config()
const Fastify = require('fastify')

// ─── INITIALISATION ───────────────────────────────────────────────────────────

// En production, le backend tourne derrière l'ingress Scaleway : sans
// trustProxy, `req.ip` est l'IP du proxy et NON celle du·de la participant·e.
// Conséquence : la limite de débit ci-dessous (par IP) devenait un quota
// *partagé par tout le monde* — lors d'un pic (plusieurs dizaines de
// participant·e·s lancé·e·s en même temps, typiquement une passation
// multi-sites), de vrais participants pouvaient être bloqués en 429.
//
// On fait donc confiance à N sauts de proxy (1 par défaut) : Fastify prend
// alors l'adresse ajoutée par le proxy de confiance, c'est-à-dire la vraie IP
// cliente. Volontairement PAS `true`, qui prendrait la valeur la plus à gauche
// de X-Forwarded-For — falsifiable, et donc contournable pour la limite.
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? 1)

const fastify = Fastify({
  trustProxy: Number.isFinite(TRUST_PROXY_HOPS) && TRUST_PROXY_HOPS > 0 ? TRUST_PROXY_HOPS : false,
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

// ─── PLUGINS ──────────────────────────────────────────────────────────────────

async function registerPlugins() {
  // Security headers
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false, // Managed by Next.js
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Frontend & API sur des sous-domaines différents
    xFrameOptions: false, // Désactivé : les tâches externes s'affichent en iframe cross-origin (www → api)
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })

  // Rate limiting — limite globale par IP, réglable par RATE_LIMIT_MAX
  // (requêtes par minute et par adresse).
  //
  // Pourquoi 3000 et non 600 : tant que le proxy Scaleway n'est pas configuré
  // pour transmettre la vraie IP cliente (TRUST_PROXY_HOPS, cf. plus haut),
  // toutes les requêtes partagent UNE adresse, donc UN quota. Un·e
  // participant·e consomme ~11 requêtes dans sa première minute (chargement
  // de l'étude, puis 2 par page) : 600/min bloquait dès ~55 arrivées
  // simultanées — vécu lors d'une passation multi-sites. 3000/min laisse
  // passer ~270 arrivées dans la même minute, et le même chiffre s'applique
  // à une classe entière derrière un seul wifi. Cela reste un plafond
  // efficace contre un script abusif (50 requêtes par seconde).
  const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 3000)
  await fastify.register(require('@fastify/rate-limit'), {
    max: Number.isFinite(RATE_LIMIT_MAX) && RATE_LIMIT_MAX > 0 ? RATE_LIMIT_MAX : 3000,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  // CORS — autorise le frontend à parler au backend
  // Upload de fichiers
  await fastify.register(require('@fastify/multipart'), { limits: { fileSize: 50 * 1024 * 1024 } })

  // Servir les fichiers uploadés
  await fastify.register(require('@fastify/static'), {
    root: require('path').join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  })

  await fastify.register(require('@fastify/cors'), {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })

  // Cookies — pour le refresh token
  await fastify.register(require('@fastify/cookie'))

  // JWT — pour l'authentification
  await fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET,
  })

  // Décorateur d'authentification — utilisé dans les routes protégées
  fastify.decorate('authenticate', async function (req, reply) {
    try {
      await req.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Non authentifié. Veuillez vous connecter.' })
    }
  })

  // Prisma — connexion à la base de données
  await fastify.register(require('./plugins/prisma'))
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

async function registerRoutes() {
  // Vérification de santé
  // `ip` = adresse retenue par le serveur pour la limite de débit (cf.
  // trustProxy plus haut). Chacun n'y voit que SA propre adresse, déjà connue
  // de lui : aucune information n'est divulguée. Sert à vérifier, après
  // déploiement, que le proxy transmet bien la vraie IP cliente et qu'elle
  // n'est pas falsifiable.
  fastify.get('/health', async (req) => ({
    status: 'ok',
    ip: req.ip,
    timestamp: new Date().toISOString(),
  }))

  // Routes authentification
  await fastify.register(require('./routes/auth'), { prefix: '/api/auth' })

  // Routes projets
  await fastify.register(require('./routes/projects'), { prefix: '/api/projects' })

  // Routes études
  await fastify.register(require('./routes/studies'), { prefix: '/api/studies' })

  // Routes stimulus
  await fastify.register(require('./routes/stimulus'), { prefix: '/api/stimulus' })

  // Routes design expérimental
  await fastify.register(require('./routes/design'), { prefix: '/api/studies' })

  // Routes publiques participant
  await fastify.register(require('./routes/run'), { prefix: '/api/run' })

  // Routes export (CSV, Excel, PDF codebook)
  await fastify.register(require('./routes/export'), { prefix: '/api/studies' })

  // Upload générique de fichiers médias (questions image/audio/vidéo)
  await fastify.register(require('./routes/media'), { prefix: '/api/media' })

  // Routes administration
  await fastify.register(require('./routes/admin'), { prefix: '/api/admin' })

  // Routes feedback utilisateurs
  await fastify.register(require('./routes/feedback'), { prefix: '/api/feedback' })
}

// ─── GESTION DES ERREURS ──────────────────────────────────────────────────────

fastify.setErrorHandler((error, req, reply) => {
  fastify.log.error(error)

  // Erreurs de validation Fastify
  if (error.validation) {
    return reply.status(400).send({
      error: 'Données invalides.',
      details: error.validation,
    })
  }

  // Erreurs Prisma
  if (error.code === 'P2002') {
    return reply.status(400).send({ error: 'Cette valeur existe déjà.' })
  }

  const statusCode = error.statusCode || 500
  return reply.status(statusCode).send({
    error: statusCode === 500 ? 'Erreur interne du serveur.' : error.message,
  })
})

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────

async function start() {
  const port = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '3002'))
  const host = '0.0.0.0'

  try {
    await registerPlugins()
    await registerRoutes()

    await fastify.listen({ port, host })
    console.log(`\n🚀 MindCraft API démarrée sur http://${host}:${port}`)
    console.log(`📊 Base de données : ${process.env.DATABASE_URL?.split('@')[1] || 'configurée'}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
