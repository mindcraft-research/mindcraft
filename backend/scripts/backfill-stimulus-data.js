#!/usr/bin/env node
/**
 * Backfill script: populate the `data` (Bytes) field for existing files
 * that are on disk but not stored in the database.
 *
 * Handles both StimulusFile (stimulus images/audio/video) and MediaFile
 * (question media, external HTML tasks).
 *
 * Usage: node scripts/backfill-stimulus-data.js
 */
const path = require('path')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

async function backfillStimulus() {
  console.log('── StimulusFile ──')
  const files = await prisma.stimulusFile.findMany({
    where: { data: null, mimetype: { not: 'text/plain' } },
    select: { id: true, filename: true, originalName: true, mimetype: true },
  })

  console.log(`Found ${files.length} stimulus files without data in DB`)
  let updated = 0, skipped = 0

  for (const file of files) {
    const diskPath = path.join(UPLOAD_DIR, file.filename)
    if (!fs.existsSync(diskPath)) {
      console.log(`  SKIP ${file.originalName} — not on disk`)
      skipped++
      continue
    }
    const buffer = fs.readFileSync(diskPath)
    await prisma.stimulusFile.update({ where: { id: file.id }, data: { data: buffer } })
    console.log(`  OK   ${file.originalName} (${(buffer.length / 1024).toFixed(1)} KB)`)
    updated++
  }
  console.log(`Stimulus: ${updated} updated, ${skipped} skipped\n`)
}

async function backfillMedia() {
  console.log('── MediaFile (from disk) ──')
  // Lire tous les fichiers du disque et vérifier s'ils existent déjà en DB
  if (!fs.existsSync(UPLOAD_DIR)) {
    console.log('No uploads directory found, skipping.\n')
    return
  }

  const diskFiles = fs.readdirSync(UPLOAD_DIR)
  const existing = await prisma.mediaFile.findMany({ select: { filename: true } })
  const existingSet = new Set(existing.map((f) => f.filename))

  let created = 0, skipped = 0

  const mimeMap = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.html': 'text/html', '.htm': 'text/html',
  }

  for (const filename of diskFiles) {
    if (existingSet.has(filename)) { skipped++; continue }
    const ext = path.extname(filename).toLowerCase()
    const mimetype = mimeMap[ext]
    if (!mimetype) { skipped++; continue }

    const diskPath = path.join(UPLOAD_DIR, filename)
    const buffer = fs.readFileSync(diskPath)
    await prisma.mediaFile.create({
      data: { filename, originalName: filename, mimetype, size: buffer.length, data: buffer },
    })
    console.log(`  OK   ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`)
    created++
  }
  console.log(`Media: ${created} created, ${skipped} skipped\n`)
}

async function main() {
  await backfillStimulus()
  await backfillMedia()
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
