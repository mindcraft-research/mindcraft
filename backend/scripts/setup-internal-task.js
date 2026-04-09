require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const BLOCK_ID = 'cmnqig1qm001013isq91d3196'

const STIMULI = [
  { name: 'Renard',   cat: 'animal' },
  { name: 'Chêne',    cat: 'vegetal' },
  { name: 'Dauphin',  cat: 'animal' },
  { name: 'Fougère',  cat: 'vegetal' },
  { name: 'Hibou',    cat: 'animal' },
  { name: 'Orchidée', cat: 'vegetal' },
  { name: 'Loutre',   cat: 'animal' },
  { name: 'Séquoia',  cat: 'vegetal' },
  { name: 'Aigle',    cat: 'animal' },
  { name: 'Bambou',   cat: 'vegetal' },
  { name: 'Tortue',   cat: 'animal' },
  { name: 'Mousse',   cat: 'vegetal' },
]

const STEPS = [
  { type: 'FIXATION', settings: { symbol: '+', durationMin: 400, durationMax: 700 } },
  { type: 'STIMULUS', settings: { durationMin: 0, durationMax: 0 } },
  { type: 'RESPONSE_KEY', settings: { maxResponseTime: 2500, keyMap: [{ key: 'KeyF', label: 'Animal' }, { key: 'KeyJ', label: 'Végétal' }] } },
  { type: 'FEEDBACK', settings: { correctText: '✓', incorrectText: '✗', timeoutText: 'Trop lent !', durationMin: 600, durationMax: 600 } },
  { type: 'ITI', settings: { durationMin: 300, durationMax: 500 } },
]

async function main() {
  console.log('Setting up internal task...')

  // 1. Update block settings (remove externalUrl)
  await prisma.block.update({
    where: { id: BLOCK_ID },
    data: {
      settings: {
        name: 'Tâche de catégorisation (interne)',
        randomize: true,
        repetitions: 1,
        practiceTrials: 4,
        practiceBlock: true,
      }
    }
  })
  console.log('  ✓ Block settings updated')

  // 2. Delete old sequence steps
  await prisma.trialSequenceStep.deleteMany({ where: { blockId: BLOCK_ID } })
  console.log('  ✓ Old steps deleted')

  // 3. Create new sequence steps
  for (let i = 0; i < STEPS.length; i++) {
    await prisma.trialSequenceStep.create({
      data: { type: STEPS[i].type, order: i, settings: STEPS[i].settings, blockId: BLOCK_ID }
    })
  }
  console.log('  ✓ 5 sequence steps created')

  // 4. Delete old stimulus files
  await prisma.stimulusFile.deleteMany({ where: { blockId: BLOCK_ID } })
  console.log('  ✓ Old files deleted')

  // 5. Create stimulus files (text-based)
  for (const s of STIMULI) {
    await prisma.stimulusFile.create({
      data: {
        filename: s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '.txt',
        originalName: s.name,
        mimetype: 'text/plain',
        size: 0,
        url: '',
        category: s.cat,
        blockId: BLOCK_ID,
      }
    })
  }
  console.log('  ✓ 12 stimulus files created')

  console.log('\nDone!')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
