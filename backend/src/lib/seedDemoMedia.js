'use strict'

const fs = require('fs')
const path = require('path')

const ASSETS_DIR = path.join(__dirname, 'demo-assets')

// Extension → MIME type
const MIME_BY_EXT = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
}

/**
 * Insère dans la table MediaFile chaque fichier présent dans `demo-assets/`
 * qui n'y est pas déjà. Idempotent.
 *
 * Utilisé :
 *   - lors de la création d'une étude de démo (createDemoStudy)
 *   - via le script one-shot `scripts/seed-demo-assets.js`
 */
async function seedDemoMedia(prisma) {
  if (!fs.existsSync(ASSETS_DIR)) {
    return { inserted: 0, skipped: 0, missing: 0 }
  }

  const files = fs.readdirSync(ASSETS_DIR).filter((f) => !f.startsWith('.'))
  let inserted = 0
  let skipped = 0

  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase()
    const mimetype = MIME_BY_EXT[ext]
    if (!mimetype) continue // ignore les fichiers non-médias éventuels

    const existing = await prisma.mediaFile.findUnique({
      where: { filename },
      select: { filename: true },
    })
    if (existing) { skipped++; continue }

    const filepath = path.join(ASSETS_DIR, filename)
    const data = fs.readFileSync(filepath)

    await prisma.mediaFile.create({
      data: {
        filename,
        originalName: filename,
        mimetype,
        size: data.length,
        data,
      },
    })
    inserted++
  }

  return { inserted, skipped }
}

module.exports = { seedDemoMedia }
