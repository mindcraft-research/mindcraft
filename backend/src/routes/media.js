// SPDX-License-Identifier: AGPL-3.0-or-later
const path = require('path')
const fs   = require('fs')
const crypto = require('crypto')
const { cheminUpload } = require('../lib/fichiers')

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
    // Un simple nom de fichier, jamais un chemin (« ../.env »…).
    const diskPath = cheminUpload(filename)
    if (!diskPath) return reply.status(404).send({ error: 'Fichier introuvable.' })

    const file = await prisma.mediaFile.findUnique({
      where: { filename },
      select: { data: true, mimetype: true },
    })

    if (!file) {
      // Fallback : disque local
      if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
        return reply.type('application/octet-stream').send(fs.readFileSync(diskPath))
      }
      return reply.status(404).send({ error: 'Fichier introuvable.' })
    }

    reply
      .header('Cache-Control', 'public, max-age=31536000, immutable')
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
      const filepath = cheminUpload(filename)
      if (!filepath) {
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
