const path = require('path')
const fs   = require('fs')
const crypto = require('crypto')

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/webm',
  'video/mp4', 'video/webm', 'video/ogg',
  'text/html',
]

module.exports = async function mediaRoutes(fastify) {
  const { prisma } = fastify

  // ── Servir les fichiers médias depuis la DB (PUBLIC, pas d'auth) ───────────
  fastify.get('/files/:filename', { onRequest: [] }, async (req, reply) => {
    const { filename } = req.params

    const file = await prisma.mediaFile.findUnique({
      where: { filename },
      select: { data: true, mimetype: true },
    })

    if (!file) {
      // Fallback : disque local
      const diskPath = path.join(UPLOAD_DIR, filename)
      if (fs.existsSync(diskPath)) {
        return reply.type('application/octet-stream').send(fs.readFileSync(diskPath))
      }
      return reply.status(404).send({ error: 'Fichier introuvable.' })
    }

    reply
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .removeHeader('X-Frame-Options')
      .type(file.mimetype)
      .send(file.data)
  })

  // ── Upload générique de fichier média ─────────────────────────────────────
  fastify.post('/upload', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const parts = req.parts()
    for await (const part of parts) {
      if (part.type !== 'file') continue

      if (!ALLOWED.includes(part.mimetype)) {
        return reply.status(400).send({ error: `Type non supporté : ${part.mimetype}` })
      }

      const ext      = path.extname(part.filename) || ''
      const unique   = crypto.randomBytes(16).toString('hex')
      const filename = `${unique}${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)
      if (!filepath.startsWith(path.resolve(UPLOAD_DIR))) {
        return reply.status(400).send({ error: 'Chemin de fichier invalide.' })
      }

      const chunks = []
      for await (const chunk of part.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      // Écriture disque (fallback dev) + stockage DB (persistant)
      try { fs.writeFileSync(filepath, buffer) } catch {}

      await prisma.mediaFile.create({
        data: {
          filename,
          originalName: part.filename,
          mimetype: part.mimetype,
          size: buffer.length,
          data: buffer,
        },
      })

      return reply.status(201).send({ url: `/api/media/files/${filename}`, filename, originalName: part.filename })
    }
    return reply.status(400).send({ error: 'Aucun fichier reçu.' })
  })
}
