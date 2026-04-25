'use strict'

/**
 * Script one-shot : insère dans la table MediaFile tous les fichiers
 * présents dans `src/lib/demo-assets/` qui n'y sont pas déjà.
 *
 * Usage (depuis backend/) :
 *   node scripts/seed-demo-assets.js
 *
 * Pour la prod (sur Scaleway), on peut le lancer ponctuellement avec
 * l'URL de la BDD prod :
 *   DATABASE_URL="postgresql://…" node scripts/seed-demo-assets.js
 *
 * Le script est idempotent : on peut le relancer sans risque, il
 * skippe les fichiers déjà présents.
 */

const { PrismaClient } = require('@prisma/client')
const { seedDemoMedia } = require('../src/lib/seedDemoMedia')

;(async () => {
  const prisma = new PrismaClient()
  try {
    console.log('Seeding demo media files into MediaFile table…')
    const result = await seedDemoMedia(prisma)
    console.log(`✓ Inserted: ${result.inserted}`)
    console.log(`  Skipped (already present): ${result.skipped}`)
  } catch (err) {
    console.error('Error:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
})()
