/**
 * Exports the demo study (Etude 1 - Test) as a JSON template.
 * Run: cd backend && node scripts/seed-demo-study.js
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const prisma = new PrismaClient()

async function main() {
  const study = await prisma.study.findUnique({
    where: { id: 'cmnlwncq9000112gqb64flmsc' },
    include: {
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              choices: { orderBy: { order: 'asc' } },
              matrixItems: { orderBy: { order: 'asc' } },
            },
          },
          sequenceSteps: { orderBy: { order: 'asc' } },
          stimulusFiles: { orderBy: { createdAt: 'asc' } },
        },
      },
      design: {
        include: {
          factors: {
            orderBy: { order: 'asc' },
            include: { levels: { orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  })

  if (!study) { console.error('Study not found'); process.exit(1) }

  // Strip IDs and foreign keys — keep only the structural data
  const template = {
    name: 'Étude de démonstration',
    description: 'Étude complète illustrant toutes les fonctionnalités de MindCraft : questionnaires, tâches expérimentales, logique conditionnelle, mesures physiologiques.',
    metadata: study.metadata,
    blocks: study.blocks.map((b) => ({
      type: b.type,
      order: b.order,
      label: b.label,
      settings: b.settings,
      questions: (b.questions || []).map((q) => ({
        code: q.code,
        type: q.type,
        text: q.text,
        required: q.required,
        randomize: q.randomize,
        order: q.order,
        settings: q.settings,
        choices: (q.choices || []).map((c) => ({
          code: c.code,
          label: c.label,
          order: c.order,
          anchored: c.anchored,
          mediaUrl: c.mediaUrl,
          mediaType: c.mediaType,
        })),
        matrixItems: (q.matrixItems || []).map((m) => ({
          code: m.code,
          label: m.label,
          order: m.order,
          reversed: m.reversed,
          left: m.left,
          right: m.right,
        })),
      })),
      sequenceSteps: (b.sequenceSteps || []).map((s) => ({
        type: s.type,
        order: s.order,
        settings: s.settings,
      })),
      stimulusFiles: (b.stimulusFiles || []).map((f) => ({
        filename: f.filename,
        originalName: f.originalName,
        mimetype: f.mimetype,
        size: f.size,
        url: f.url,
        category: f.category,
      })),
    })),
    design: study.design ? {
      designType: study.design.designType,
      counterbalanceMethod: study.design.counterbalanceMethod,
      quotaMode: study.design.quotaMode,
      targetN: study.design.targetN,
      settings: study.design.settings,
      factors: study.design.factors.map((f) => ({
        name: f.name,
        type: f.type,
        order: f.order,
        levels: f.levels.map((l) => ({
          name: l.name,
          code: l.code,
          order: l.order,
        })),
      })),
    } : null,
  }

  const outPath = path.join(__dirname, '..', 'src', 'lib', 'demoStudyTemplate.json')
  fs.writeFileSync(outPath, JSON.stringify(template, null, 2), 'utf-8')
  console.log(`Template exported to ${outPath}`)
  console.log(`  ${template.blocks.length} blocks`)
  console.log(`  ${template.blocks.reduce((s, b) => s + (b.questions?.length || 0), 0)} questions`)
  console.log(`  ${template.blocks.reduce((s, b) => s + (b.stimulusFiles?.length || 0), 0)} stimulus files`)

  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
