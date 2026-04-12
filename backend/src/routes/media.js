const path = require('path')
const fs   = require('fs')
const crypto = require('crypto')

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/webm',
  'video/mp4', 'video/webm', 'video/ogg',
]

module.exports = async function mediaRoutes(fastify) {
  // Upload générique de fichier média (image, audio, vidéo)
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
      fs.writeFileSync(filepath, Buffer.concat(chunks))

      return reply.status(201).send({ url: `/uploads/${filename}`, filename, originalName: part.filename })
    }
    return reply.status(400).send({ error: 'Aucun fichier reçu.' })
  })
}
