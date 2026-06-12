/**
 * Simule 10 participants pour l'Étude de démonstration.
 * Crée des sessions, des réponses aux questions et des réponses aux essais.
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const prisma = new PrismaClient()

const STUDY_ID = 'cmnlwncq9000112gqb64flmsc'
const N = 10

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[rand(0, arr.length - 1)] }

// Réponses simulées par type de question
function generateResponse(q) {
  const t = q.type
  const choices = q.choices || []
  const matrixItems = q.matrixItems || []
  const s = typeof q.settings === 'string' ? JSON.parse(q.settings) : (q.settings || {})

  switch (t) {
    case 'RADIO':
    case 'SELECT':
    case 'BUTTON_GROUP':
      return choices.length > 0 ? pick(choices).code : '1'

    case 'MEDIA_RADIO':
    case 'RADIO_COMMENT':
      if (t === 'RADIO_COMMENT') return { choice: choices.length > 0 ? pick(choices).code : '1', comment: pick(['Bonne option', 'Je préfère celle-ci', 'Sans avis particulier']) }
      return choices.length > 0 ? pick(choices).code : '1'

    case 'CHECKBOX':
    case 'MEDIA_CHECKBOX': {
      const n = rand(1, Math.min(3, choices.length))
      const selected = [...choices].sort(() => Math.random() - 0.5).slice(0, n)
      return selected.map(c => c.code)
    }

    case 'CHECKBOX_COMMENT': {
      const n = rand(1, Math.min(3, choices.length))
      const selected = [...choices].sort(() => Math.random() - 0.5).slice(0, n)
      return { choices: selected.map(c => c.code), comment: pick(['Important pour moi', 'Choix réfléchi', '']) }
    }

    case 'DRILL_DOWN': {
      const l1 = choices.length > 0 ? pick(choices).code : '1'
      const subs = s.subChoices?.[l1] || []
      return { l1, l2: subs.length > 0 ? pick(subs).code : '' }
    }

    case 'LIKERT':
      return String(rand(1, s.points || 5))

    case 'MATRIX':
    case 'SEMANTIC_DIFF': {
      const result = {}
      matrixItems.forEach(m => { result[m.code] = String(rand(1, s.columns || 5)) })
      return result
    }

    case 'SIDE_BY_SIDE': {
      const result = {}
      matrixItems.forEach(m => { result[m.code] = { left: String(rand(1, s.columns || 5)), right: String(rand(1, s.columns || 5)) } })
      return result
    }

    case 'SLIDER':
      return String(rand(0, 100))

    case 'TEXT':
    case 'INPUT_DEMAND':
      return pick(['Écologie', 'Recyclage', 'Protection des forêts', 'Développement durable', 'Sensibilisation climatique'])

    case 'NUMERIC':
      return String(rand(s.min || 0, s.max || 100))

    case 'EQUATION':
      return String(rand(1, 200))

    case 'COMPUTED': {
      const vars = s.variables || []
      const result = {}
      vars.forEach(v => { result[v.code] = String(rand(v.min || 1, v.max || 100)) })
      result._result = rand(1, 100)
      return result
    }

    case 'CONSTANT_SUM': {
      const total = s.total || 100
      const result = {}
      let remaining = total
      choices.forEach((c, i) => {
        if (i === choices.length - 1) { result[c.code] = remaining }
        else { const v = rand(0, remaining); result[c.code] = v; remaining -= v }
      })
      return result
    }

    case 'RANKING':
      return [...choices].sort(() => Math.random() - 0.5).map(c => c.code)

    case 'CONSENT':
      return 'accept'

    case 'DATE':
      if (s.format === 'datetime') return { date: '2026-05-15', time: '14:30' }
      return '2026-05-15'

    case 'FILE_UPLOAD':
      return 'rapport_v3.pdf'

    case 'HOTSPOT': {
      // Format depuis la correction du bug multi-clics (issue #83 relance,
      // point b) : tableau de points { x, y }. Le runner reste compatible
      // avec l'ancien format single-point pour les réponses déjà stockées.
      const maxClicks = Math.max(1, Number(s.maxClicks) || 1)
      const n = rand(1, maxClicks)
      return Array.from({ length: n }, () => ({ x: rand(10, 90), y: rand(10, 90) }))
    }

    case 'DRAG_DROP': {
      const zones = s.zones || []
      const result = {}
      zones.forEach(z => { result[z.code] = [] })
      choices.forEach(c => {
        const zone = pick(zones)
        if (zone) result[zone.code].push(c.code)
      })
      return result
    }

    case 'DROP_WORD': {
      const passage = s.passage || ''
      const blanks = passage.match(/\[BLANK\]/gi) || []
      const words = (s.wordBank || '').split('\n').filter(Boolean)
      const result = {}
      blanks.forEach((_, i) => { result[String(i)] = words[i] || 'mot' })
      return result
    }

    case 'FILL_BLANK': {
      const passage = s.passage || ''
      const blanks = passage.match(/\[BLANK\]/gi) || []
      const result = {}
      blanks.forEach((_, i) => { result[String(i)] = pick(['jardin', 'papillon', 'rossignol', 'respirer', 'nature']) })
      return result
    }

    case 'HIGHLIGHT':
      return ['déforestation', 'perturbé', 'réchauffement']

    case 'TIMING':
      return String(rand(5000, 45000))

    case 'META_INFO':
      return { browser: 'Chrome 120', os: 'Windows 11', screen: '1920x1080', language: 'fr-FR' }

    case 'DISPLAY':
    case 'IMAGE':
    case 'AUDIO':
    case 'VIDEO':
      return null // Pas de réponse pour les types d'affichage

    default:
      return '1'
  }
}

async function main() {
  console.log(`\n═══ Simulation de ${N} participants ═══\n`)

  // Charger l'étude complète
  const study = await prisma.study.findUnique({
    where: { id: STUDY_ID },
    include: {
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { choices: { orderBy: { order: 'asc' } }, matrixItems: { orderBy: { order: 'asc' } } },
          },
          stimulusFiles: true,
          sequenceSteps: { orderBy: { order: 'asc' } },
        },
      },
      design: {
        include: {
          factors: {
            include: { levels: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  })

  if (!study) { console.error('Étude introuvable'); process.exit(1) }

  const questionBlocks = study.blocks.filter(b => b.type === 'QUESTION')
  const stimulusBlocks = study.blocks.filter(b => b.type === 'STIMULUS')
  const factors = study.design?.factors || []

  console.log(`Étude : ${study.name}`)
  console.log(`Blocs question : ${questionBlocks.length}`)
  console.log(`Blocs tâche : ${stimulusBlocks.length}`)
  console.log(`Facteurs : ${factors.map(f => f.name).join(', ') || 'aucun'}`)
  console.log()

  for (let p = 0; p < N; p++) {
    const participantId = `sim_${crypto.randomBytes(6).toString('hex')}`
    const conditionAssignments = []

    // Assigner des conditions (par ID de niveau)
    for (const factor of factors) {
      if (factor.levels.length > 0) {
        const level = factor.levels[p % factor.levels.length]
        conditionAssignments.push({ factorLevelId: level.id, levelCode: level.code, factorName: factor.name })
      }
    }

    // Créer la session
    const session = await prisma.participantSession.create({
      data: {
        participantId,
        studyId: STUDY_ID,
        status: 'COMPLETED',
        counterbalanceIndex: p,
        metadata: { source: 'simulation', userAgent: 'SimBot/1.0' },
        allocatedAt: new Date(Date.now() - rand(3600000, 86400000)),
        startedAt: new Date(Date.now() - rand(1800000, 3600000)),
        completedAt: new Date(Date.now() - rand(0, 1800000)),
        conditionAssignments: conditionAssignments.length > 0 ? {
          create: conditionAssignments.map(ca => ({
            factorLevelId: ca.factorLevelId,
          })),
        } : undefined,
      },
    })

    // Réponses aux questions
    let qCount = 0
    for (const block of questionBlocks) {
      const settings = typeof block.settings === 'string' ? JSON.parse(block.settings) : (block.settings || {})
      const order = settings._questionOrder
      let questions = block.questions
      if (Array.isArray(order) && order.length > 0) {
        const qMap = {}
        questions.forEach(q => { qMap[q.id] = q })
        questions = order.map(id => qMap[id]).filter(Boolean)
      }

      for (const q of questions) {
        if (!q.code) continue
        const value = generateResponse(q)
        if (value === null) continue

        await prisma.questionResponse.create({
          data: {
            participantId,
            studyId: STUDY_ID,
            blockId: block.id,
            questionCode: q.code,
            value: typeof value === 'object' ? value : String(value),
          },
        })
        qCount++
      }
    }

    // Réponses aux essais (tâches)
    let tCount = 0
    for (const block of stimulusBlocks) {
      const files = block.stimulusFiles || []
      const steps = block.sequenceSteps || []
      if (files.length === 0 || steps.length === 0) continue

      const keyMap = steps.find(s => s.type === 'RESPONSE_KEY')?.settings?.keyMap || []
      const shuffled = [...files].sort(() => Math.random() - 0.5)
      const trials = shuffled.slice(0, Math.min(12, shuffled.length))

      for (let ti = 0; ti < trials.length; ti++) {
        const file = trials[ti]
        const correctKey = keyMap.find(km =>
          km.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
          (file.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
        const isCorrect = Math.random() > 0.2 // 80% accuracy
        const pressedKey = isCorrect && correctKey ? correctKey.key : (keyMap.length > 0 ? pick(keyMap).key : 'KeyF')

        await prisma.trialResponse.create({
          data: {
            participantId,
            studyId: STUDY_ID,
            blockId: block.id,
            trialIndex: ti,
            stimulusFile: file.originalName,
            stimulusCategory: file.category || null,
            keyPressed: pressedKey,
            correct: isCorrect,
            rtMs: rand(250, 1200),
            response: null,
          },
        })
        tCount++
      }
    }

    const condStr = conditionAssignments.map(ca => `${ca.factorName}=${ca.levelCode}`).join(', ') || '—'
    console.log(`  ✓ Participant ${p + 1}/${N} (${participantId}) — ${qCount} réponses, ${tCount} essais — Condition: ${condStr}`)
  }

  console.log(`\n═══ Simulation terminée ! ${N} participants créés. ═══`)
  await prisma.$disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
