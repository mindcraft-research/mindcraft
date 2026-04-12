require('dotenv').config()
const Fastify = require('fastify')

// ─── INITIALISATION ───────────────────────────────────────────────────────────

const fastify = Fastify({
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
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })

  // Rate limiting
  await fastify.register(require('@fastify/rate-limit'), {
    max: 100,
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
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

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
  try {
    await registerPlugins()
    await registerRoutes()

    const port = parseInt(process.env.PORT || '3002')
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.HOST || 'localhost')

    await fastify.listen({ port, host })
    console.log(`\n🚀 MindCraft API démarrée sur http://${host}:${port}`)
    console.log(`📊 Base de données : ${process.env.DATABASE_URL?.split('@')[1] || 'configurée'}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
