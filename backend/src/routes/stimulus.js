const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  'video/mp4', 'video/webm', 'video/ogg',
]

async function stimulusRoutes(fastify) {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)

  // ── Upload de fichiers stimulus ────────────────────────────────────────────
  fastify.post('/blocks/:blockId/upload', async (req, reply) => {
    const { blockId } = req.params

    const block = await prisma.block.findUnique({ where: { id: blockId } })
    if (!block) return reply.status(404).send({ error: 'Bloc introuvable.' })

    const parts = req.parts()
    const uploaded = []

    for await (const part of parts) {
      if (part.type !== 'file') continue
      if (!ALLOWED_TYPES.includes(part.mimetype)) {
        return reply.status(400).send({ error: `Type non supporté : ${part.mimetype}` })
      }

      const ext = path.extname(part.filename)
      const unique = crypto.randomBytes(16).toString('hex')
      const filename = `${unique}${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)

      // Récupérer la catégorie depuis les champs du formulaire
      const category = req.body?.category || null

      const chunks = []
      for await (const chunk of part.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      fs.writeFileSync(filepath, buffer)

      const stimFile = await prisma.stimulusFile.create({
        data: {
          filename,
          originalName: part.filename,
          mimetype: part.mimetype,
          size: buffer.length,
          url: `/uploads/${filename}`,
          category: category,
          blockId,
        },
      })

      uploaded.push(stimFile)
    }

    return reply.status(201).send({ files: uploaded })
  })

  // ── Ajouter un stimulus textuel (mot) ──────────────────────────────────────
  fastify.post('/blocks/:blockId/text', async (req, reply) => {
    const { blockId } = req.params
    const { text, category } = req.body

    if (!text) return reply.status(400).send({ error: 'Le texte est requis.' })

    const block = await prisma.block.findUnique({ where: { id: blockId } })
    if (!block) return reply.status(404).send({ error: 'Bloc introuvable.' })

    const stimFile = await prisma.stimulusFile.create({
      data: {
        filename: text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_') + '.txt',
        originalName: text,
        mimetype: 'text/plain',
        size: 0,
        url: '',
        category: category || null,
        blockId,
      },
    })

    return reply.status(201).send({ file: stimFile })
  })

  // ── Lister les fichiers d'un bloc ──────────────────────────────────────────
  fastify.get('/blocks/:blockId/files', async (req, reply) => {
    const { blockId } = req.params
    const files = await prisma.stimulusFile.findMany({
      where: { blockId },
      orderBy: { createdAt: 'asc' },
    })
    return reply.send({ files })
  })

  // ── Supprimer un fichier ───────────────────────────────────────────────────
  fastify.delete('/files/:fileId', async (req, reply) => {
    const { fileId } = req.params
    const file = await prisma.stimulusFile.findUnique({ where: { id: fileId } })
    if (!file) return reply.status(404).send({ error: 'Fichier introuvable.' })

    // Supprimer le fichier physique
    const filepath = path.join(UPLOAD_DIR, file.filename)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)

    await prisma.stimulusFile.delete({ where: { id: fileId } })
    return reply.send({ message: 'Fichier supprimé.' })
  })

  // ── Sauvegarder la séquence d'essai ───────────────────────────────────────
  fastify.put('/blocks/:blockId/sequence', async (req, reply) => {
    const { blockId } = req.params
    const { steps } = req.body

    if (!Array.isArray(steps)) return reply.status(400).send({ error: 'steps doit être un tableau.' })

    // Supprimer les anciennes étapes et recréer
    await prisma.trialSequenceStep.deleteMany({ where: { blockId } })

    const created = await Promise.all(
      steps.map((step, i) =>
        prisma.trialSequenceStep.create({
          data: { type: step.type, order: i, settings: step.settings || {}, blockId },
        })
      )
    )

    return reply.send({ steps: created })
  })

  // ── Récupérer la séquence d'un bloc ───────────────────────────────────────
  fastify.get('/blocks/:blockId/sequence', async (req, reply) => {
    const { blockId } = req.params
    const steps = await prisma.trialSequenceStep.findMany({
      where: { blockId },
      orderBy: { order: 'asc' },
    })
    return reply.send({ steps })
  })

  // ── Sauvegarder les réponses d'essais (depuis le portail participant) ──────
  fastify.post('/responses', { onRequest: [] }, async (req, reply) => {
    const { participantId, studyId, blockId, trials, eventLog } = req.body

    if (!participantId || !studyId || !blockId || !Array.isArray(trials)) {
      return reply.status(400).send({ error: 'Données manquantes.' })
    }

    const created = await Promise.all(
      trials.map((t, i) =>
        prisma.trialResponse.create({
          data: {
            participantId,
            studyId,
            blockId,
            trialIndex: i,
            stimulusFile: t.stimulusFile || null,
            stimulusCategory: t.stimulusCategory || null,
            keyPressed: t.keyPressed || null,
            correct: t.correct ?? null,
            rtMs: t.rtMs ?? null,
            response: t.response || null,
          },
        })
      )
    )

    // Store eventLog as a separate record (trialIndex: -1) if provided
    if (eventLog && Array.isArray(eventLog) && eventLog.length > 0) {
      await prisma.trialResponse.create({
        data: {
          participantId,
          studyId,
          blockId,
          trialIndex: -1,
          stimulusFile: null,
          stimulusCategory: null,
          keyPressed: null,
          correct: null,
          rtMs: null,
          response: JSON.stringify(eventLog),
        },
      })
    }

    // Mettre à jour le statut de la session participant si elle existe
    try {
      const session = await prisma.participantSession.findUnique({
        where: { studyId_participantId: { studyId, participantId } },
      })
      if (session && session.status === 'ALLOCATED') {
        await prisma.participantSession.update({
          where: { id: session.id },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        })
      }
    } catch { /* ne pas bloquer la sauvegarde des réponses */ }

    return reply.status(201).send({ count: created.length })
  })

  // ── Récupérer les réponses d'une étude (export) ────────────────────────────
  fastify.get('/studies/:studyId/responses', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { studyId } = req.params

    // Verify researcher owns the study
    const study = await prisma.study.findFirst({
      where: { id: studyId, project: { is: { OR: [{ ownerId: req.user.id }, { collaborators: { some: { userId: req.user.id } } }] } } },
    })
    if (!study) return reply.status(403).send({ error: 'Accès refusé.' })

    const [responses, questionResponses, sessions] = await Promise.all([
      prisma.trialResponse.findMany({
        where: { studyId },
        orderBy: [{ participantId: 'asc' }, { blockId: 'asc' }, { trialIndex: 'asc' }],
      }),
      prisma.questionResponse.findMany({
        where: { studyId },
        orderBy: [{ participantId: 'asc' }, { blockId: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.participantSession.findMany({
        where: { studyId },
        include: {
          conditionAssignments: {
            include: { factorLevel: { include: { factor: true } } },
          },
        },
      }),
    ])

    // Construire un map participantId → conditions
    const conditionMap = {}
    for (const session of sessions) {
      const conditions = {}
      for (const ca of session.conditionAssignments) {
        conditions[ca.factorLevel.factor.name] = ca.factorLevel.code
      }
      conditionMap[session.participantId] = conditions
    }

    // Enrichir les réponses avec les conditions
    const enriched = responses.map((r) => ({
      ...r,
      conditions: conditionMap[r.participantId] || {},
    }))

    const enrichedQ = questionResponses.map((r) => ({
      ...r,
      conditions: conditionMap[r.participantId] || {},
    }))

    return reply.send({ responses: enriched, questionResponses: enrichedQ, sessions })
  })
}

module.exports = stimulusRoutes
