#!/usr/bin/env node
/**
 * Backfill script: populate the `data` (Bytes) field for existing StimulusFile records
 * that have files on disk but no binary data in the database.
 *
 * Usage: node scripts/backfill-stimulus-data.js
 */
const path = require('path')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

async function main() {
  const files = await prisma.stimulusFile.findMany({
    where: { data: null, mimetype: { not: 'text/plain' } },
    select: { id: true, filename: true, originalName: true, mimetype: true },
  })

  console.log(`Found ${files.length} stimulus files without data in DB`)

  let updated = 0
  let skipped = 0

  for (const file of files) {
    const diskPath = path.join(UPLOAD_DIR, file.filename)
    if (!fs.existsSync(diskPath)) {
      console.log(`  SKIP ${file.originalName} — file not on disk: ${file.filename}`)
      skipped++
      continue
    }

    const buffer = fs.readFileSync(diskPath)
    await prisma.stimulusFile.update({
      where: { id: file.id },
      data: { data: buffer },
    })
    console.log(`  OK   ${file.originalName} (${(buffer.length / 1024).toFixed(1)} KB)`)
    updated++
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
