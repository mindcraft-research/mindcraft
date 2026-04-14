'use strict'

const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')

module.exports = async function exportRoutes(fastify) {
  const { prisma } = fastify

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function loadStudy(studyId, userId) {
    return prisma.study.findFirst({
      where: { id: studyId, project: { is: { ownerId: userId } } },
      include: {
        blocks: {
          include: {
            questions: {
              include: { choices: { orderBy: { order: 'asc' } }, matrixItems: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' },
            },
            stimulusFiles: { select: { id: true, filename: true, originalName: true, mimetype: true, size: true, url: true, category: true, createdAt: true, blockId: true } },
            sequenceSteps: { orderBy: { order: 'asc' } },
          },
          orderBy: { order: 'asc' },
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
  }

  async function loadResponses(studyId) {
    const [questionResponses, trialResponses, sessions] = await Promise.all([
      prisma.questionResponse.findMany({
        where: { studyId },
        orderBy: [{ participantId: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.trialResponse.findMany({
        where: { studyId },
        orderBy: [{ participantId: 'asc' }, { blockId: 'asc' }, { trialIndex: 'asc' }],
      }),
      prisma.participantSession.findMany({
        where: { studyId },
        include: {
          conditionAssignments: {
            include: { factorLevel: { include: { factor: true } } },
          },
        },
      }),
    ])

    const conditionMap = {}
    for (const s of sessions) {
      const conds = {}
      for (const ca of s.conditionAssignments) {
        conds[ca.factorLevel.factor.name] = ca.factorLevel.code
      }
      conditionMap[s.participantId] = { conds, status: s.status, allocatedAt: s.allocatedAt }
    }

    return { questionResponses, trialResponses, sessions, conditionMap }
  }

  function escapeCSV(v) {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  function jsonVal(v) {
    if (v === null || v === undefined) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  // ── GET /:id/export/csv ────────────────────────────────────────────────────
  // Wide-format: one row per participant, one column per question code

  fastify.get('/:id/export/csv', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params
    const study = await loadStudy(id, req.user.id)
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const { questionResponses, conditionMap } = await loadResponses(id)
    const factorNames = study.design?.factors.map((f) => f.name) ?? []

    // Collect columns in block order — expand matrix/semantic-diff/side-by-side into individual item columns
    const MATRIX_TYPES = ['MATRIX', 'SEMANTIC_DIFF', 'SIDE_BY_SIDE']
    const columns = []              // { header, questionCode, itemCode? }
    const seenHeaders = new Set()
    for (const block of study.blocks) {
      if (block.type === 'QUESTION') {
        for (const q of block.questions) {
          if (MATRIX_TYPES.includes(q.type) && q.matrixItems?.length > 0) {
            for (const item of q.matrixItems) {
              const suffix = item.reversed ? '_R' : ''
              const header = `${q.code}_${item.code}${suffix}`
              if (!seenHeaders.has(header)) {
                seenHeaders.add(header)
                columns.push({ header, questionCode: q.code, itemCode: item.code })
              }
            }
          } else {
            if (!seenHeaders.has(q.code)) {
              seenHeaders.add(q.code)
              columns.push({ header: q.code, questionCode: q.code })
            }
          }
        }
      }
    }

    const pids = [...new Set(questionResponses.map((r) => r.participantId))]
    const condCols = factorNames.map((f) => `condition_${f}`)
    const headers = ['participantId', 'status', 'allocatedAt', ...condCols, ...columns.map((c) => c.header)]

    const rows = pids.map((pid) => {
      const info = conditionMap[pid] || {}
      const row = [pid, info.status ?? '', info.allocatedAt ? info.allocatedAt.toISOString() : '']
      for (const f of factorNames) row.push(info.conds?.[f] ?? '')
      for (const col of columns) {
        const r = questionResponses.find((r) => r.participantId === pid && r.questionCode === col.questionCode)
        if (!r) { row.push(''); continue }
        if (col.itemCode) {
          // Matrix-type: extract individual item value from JSON
          const val = typeof r.value === 'object' ? r.value : (typeof r.value === 'string' ? (() => { try { return JSON.parse(r.value) } catch { return {} } })() : {})
          row.push(val[col.itemCode] ?? '')
        } else {
          row.push(jsonVal(r.value))
        }
      }
      return row.map(escapeCSV).join(',')
    })

    const csv = [headers.map(escapeCSV).join(','), ...rows].join('\n')
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="questions_${id}.csv"`)
      .send(csv)
  })

  // ── GET /:id/export/csv-trials ─────────────────────────────────────────────

  fastify.get('/:id/export/csv-trials', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params
    const study = await loadStudy(id, req.user.id)
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const { trialResponses, conditionMap } = await loadResponses(id)
    const factorNames = study.design?.factors.map((f) => f.name) ?? []
    const condCols = factorNames.map((f) => `condition_${f}`)

    const headers = [
      'participantId', ...condCols,
      'blockId', 'trialIndex', 'stimulusFile', 'stimulusCategory',
      'keyPressed', 'correct', 'rtMs', 'response',
    ]

    const rows = trialResponses.map((r) => {
      const info = conditionMap[r.participantId] || {}
      const row = [r.participantId, ...factorNames.map((f) => info.conds?.[f] ?? ''),
        r.blockId, r.trialIndex, r.stimulusFile ?? '', r.stimulusCategory ?? '',
        r.keyPressed ?? '', r.correct ?? '', r.rtMs ?? '', jsonVal(r.response)]
      return row.map(escapeCSV).join(',')
    })

    const csv = [headers.map(escapeCSV).join(','), ...rows].join('\n')
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="trials_${id}.csv"`)
      .send(csv)
  })

  // ── GET /:id/export/excel ──────────────────────────────────────────────────

  fastify.get('/:id/export/excel', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params
    const study = await loadStudy(id, req.user.id)
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const { questionResponses, trialResponses, sessions, conditionMap } = await loadResponses(id)
    const factorNames = study.design?.factors.map((f) => f.name) ?? []

    const wb = new ExcelJS.Workbook()
    wb.creator = 'MindCraft'
    wb.created = new Date()

    const NAVY = { argb: 'FF1e3a5f' }
    const WHITE = { argb: 'FFFFFFFF' }
    const LIGHT = { argb: 'FFF0F4F8' }

    function styleHeader(row) {
      row.eachCell((cell) => {
        cell.font = { bold: true, color: WHITE }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: NAVY }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFe5e7eb' } },
        }
      })
    }

    // ── Sheet 1 : Sessions ──────────────────────────────────────────────────
    const wsS = wb.addWorksheet('Sessions')
    const sessionCols = [
      { header: 'participantId', key: 'pid', width: 38 },
      { header: 'status', key: 'status', width: 14 },
      { header: 'allocatedAt', key: 'allocatedAt', width: 22 },
      ...factorNames.map((f) => ({ header: `condition_${f}`, key: `c_${f}`, width: 18 })),
    ]
    wsS.columns = sessionCols
    styleHeader(wsS.getRow(1))
    wsS.views = [{ state: 'frozen', ySplit: 1 }]
    for (const s of sessions) {
      const info = conditionMap[s.participantId] || {}
      const row = {
        pid: s.participantId, status: s.status,
        allocatedAt: s.allocatedAt,
        ...Object.fromEntries(factorNames.map((f) => [`c_${f}`, info.conds?.[f] ?? ''])),
      }
      const r = wsS.addRow(row)
      r.getCell('allocatedAt').numFmt = 'yyyy-mm-dd hh:mm:ss'
    }
    wsS.autoFilter = { from: 'A1', to: wsS.getCell(1, wsS.columns.length).address }

    // ── Sheet 2 : Questions (wide format) ──────────────────────────────────
    // Expand matrix-type questions into individual item columns with _R suffix
    const MATRIX_TYPES_XL = ['MATRIX', 'SEMANTIC_DIFF', 'SIDE_BY_SIDE']
    const xlColumns = []
    const seenXL = new Set()
    for (const block of study.blocks) {
      if (block.type === 'QUESTION') {
        for (const q of block.questions) {
          if (MATRIX_TYPES_XL.includes(q.type) && q.matrixItems?.length > 0) {
            for (const item of q.matrixItems) {
              const suffix = item.reversed ? '_R' : ''
              const header = `${q.code}_${item.code}${suffix}`
              if (!seenXL.has(header)) {
                seenXL.add(header)
                xlColumns.push({ header, key: `q_${header}`, questionCode: q.code, itemCode: item.code })
              }
            }
          } else {
            if (!seenXL.has(q.code)) {
              seenXL.add(q.code)
              xlColumns.push({ header: q.code, key: `q_${q.code}`, questionCode: q.code })
            }
          }
        }
      }
    }

    const wsQ = wb.addWorksheet('Questions')
    wsQ.columns = [
      { header: 'participantId', key: 'pid', width: 38 },
      ...factorNames.map((f) => ({ header: `condition_${f}`, key: `c_${f}`, width: 18 })),
      ...xlColumns.map((c) => ({ header: c.header, key: c.key, width: 16 })),
    ]
    styleHeader(wsQ.getRow(1))
    wsQ.views = [{ state: 'frozen', ySplit: 1 }]
    const pids = [...new Set(questionResponses.map((r) => r.participantId))]
    for (const pid of pids) {
      const info = conditionMap[pid] || {}
      const row = {
        pid,
        ...Object.fromEntries(factorNames.map((f) => [`c_${f}`, info.conds?.[f] ?? ''])),
      }
      for (const col of xlColumns) {
        const r = questionResponses.find((r) => r.participantId === pid && r.questionCode === col.questionCode)
        if (!r) { row[col.key] = ''; continue }
        if (col.itemCode) {
          const val = typeof r.value === 'object' ? r.value : (typeof r.value === 'string' ? (() => { try { return JSON.parse(r.value) } catch { return {} } })() : {})
          row[col.key] = val[col.itemCode] ?? ''
        } else {
          row[col.key] = r ? jsonVal(r.value) : ''
        }
      }
      wsQ.addRow(row)
    }
    wsQ.autoFilter = { from: 'A1', to: wsQ.getCell(1, wsQ.columns.length).address }

    // ── Sheet 3 : Stimulus RT ──────────────────────────────────────────────
    const wsT = wb.addWorksheet('Essais RT')
    wsT.columns = [
      { header: 'participantId', key: 'pid', width: 38 },
      ...factorNames.map((f) => ({ header: `condition_${f}`, key: `c_${f}`, width: 18 })),
      { header: 'blockId', key: 'blockId', width: 28 },
      { header: 'trialIndex', key: 'trialIndex', width: 12 },
      { header: 'stimulusFile', key: 'stimulusFile', width: 26 },
      { header: 'stimulusCategory', key: 'stimulusCategory', width: 18 },
      { header: 'keyPressed', key: 'keyPressed', width: 12 },
      { header: 'correct', key: 'correct', width: 10 },
      { header: 'rtMs', key: 'rtMs', width: 12 },
      { header: 'response', key: 'response', width: 20 },
    ]
    styleHeader(wsT.getRow(1))
    wsT.views = [{ state: 'frozen', ySplit: 1 }]
    for (const r of trialResponses) {
      const info = conditionMap[r.participantId] || {}
      wsT.addRow({
        pid: r.participantId,
        ...Object.fromEntries(factorNames.map((f) => [`c_${f}`, info.conds?.[f] ?? ''])),
        blockId: r.blockId, trialIndex: r.trialIndex,
        stimulusFile: r.stimulusFile ?? '', stimulusCategory: r.stimulusCategory ?? '',
        keyPressed: r.keyPressed ?? '', correct: r.correct ?? '',
        rtMs: r.rtMs ?? '', response: jsonVal(r.response),
      })
    }
    wsT.autoFilter = { from: 'A1', to: wsT.getCell(1, wsT.columns.length).address }

    const buf = await wb.xlsx.writeBuffer()
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="export_${study.name.replace(/[^\w]/g, '_')}_${id}.xlsx"`)
      .send(buf)
  })

  // ── GET /:id/export/codebook ───────────────────────────────────────────────

  fastify.get('/:id/export/codebook', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      const { id } = req.params
      const study = await loadStudy(id, req.user.id)
      if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

      const { sessions } = await loadResponses(id)

      // ── Translation maps ──────────────────────────────────────────────
      const STATUS_FR = { DRAFT: 'Brouillon', VALIDATED: 'Validée', COLLECTING: 'En collecte', COMPLETED: 'Terminée', ARCHIVED: 'Archivée' }
      const DESIGN_TYPE_FR = { BETWEEN: 'Intersujet', WITHIN: 'Intrasujet', MIXED: 'Mixte' }
      const COUNTERBALANCE_FR = {
        LATIN_SQUARE: 'Carré latin — Chaque condition apparaît exactement une fois à chaque position, éliminant les effets d\'ordre.',
        WILLIAMS: 'Design de Williams — Séquences balancées assurant que chaque condition précède et suit chaque autre condition.',
        RANDOM: 'Randomisation — Attribution aléatoire des conditions aux participants.',
      }
      const QUOTA_FR = {
        STRICT: 'Strict — Chaque condition a exactement le même nombre de participants.',
        FLEXIBLE: 'Flexible — Tolérance de déséquilibre entre conditions.',
      }
      const QUESTION_TYPE_FR = {
        RADIO: 'Choix unique', CHECKBOX: 'Choix multiple', LIKERT: 'Échelle de Likert', MATRIX: 'Matrice',
        SLIDER: 'Curseur', TEXT: 'Texte libre', NUMERIC: 'Numérique', RANKING: 'Classement',
        CONSENT: 'Consentement', SELECT: 'Liste déroulante', BUTTON_GROUP: 'Groupe de boutons',
        MEDIA_RADIO: 'Choix unique (médias)', RADIO_COMMENT: 'Choix unique + commentaire',
        DRILL_DOWN: 'Menu en cascade', MEDIA_CHECKBOX: 'Choix multiple (médias)',
        CHECKBOX_COMMENT: 'Choix multiple + commentaire', SEMANTIC_DIFF: 'Différentiel sémantique',
        SIDE_BY_SIDE: 'Side-by-side', CONSTANT_SUM: 'Somme constante', EQUATION: 'Calcul',
        COMPUTED: 'Calcul automatique', DATE: 'Date/Heure', INPUT_DEMAND: 'Saisie demandée',
        FILL_BLANK: 'Texte à trous', DROP_WORD: 'Mots à glisser', HIGHLIGHT: 'Surlignage',
        DRAG_DROP: 'Glisser-déposer', FILE_UPLOAD: 'Dépôt de fichier', HOTSPOT: 'Zone cliquable',
        TIMING: 'Chronométrage', META_INFO: 'Métadonnées', DISPLAY: 'Affichage texte',
        IMAGE: 'Affichage image', AUDIO: 'Affichage audio', VIDEO: 'Affichage vidéo',
      }
      const BLOCK_TYPE_FR = {
        WELCOME: 'Message d\'accueil', INSTRUCTION: 'Instruction', QUESTION: 'Questionnaire',
        STIMULUS: 'Tâche', LOGIC: 'Logique', DEBRIEFING: 'Message de fin',
      }

      const stripHtml = (html) => {
        if (!html) return ''
        return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
      }

      const parseSettings = (s) => (typeof s === 'string' ? JSON.parse(s) : s) || {}

      // ── PDF generation ────────────────────────────────────────────────
      await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4', info: { Title: `Codebook – ${study.name}`, Author: 'MindCraft' } })
        const chunks = []
        doc.on('data', (c) => chunks.push(c))
        doc.on('error', reject)
        doc.on('end', () => {
          const buf = Buffer.concat(chunks)
          reply
            .header('Content-Type', 'application/pdf')
            .header('Content-Disposition', `attachment; filename="codebook_${study.name.replace(/[^\w]/g, '_')}_${id}.pdf"`)
            .send(buf)
          resolve()
        })

        const C_BRAND = '#6366f1'
        const C_NAVY = '#1e3a5f'
        const C_TEAL = '#0d9488'
        const C_GRAY = '#6b7280'
        const C_DARK = '#111827'
        const C_LINE = '#e5e7eb'
        const W = 495 // usable width (595 - 2*50)

        // Pas de footer dynamique — ajouté en post-traitement via bufferPages
        const ensureSpace = (minRemaining = 80) => {
          if (doc.y > 842 - 50 - minRemaining) {
            doc.addPage()
          }
        }

        const hline = () => {
          doc.moveDown(0.2)
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C_LINE).lineWidth(0.5).stroke()
          doc.moveDown(0.3)
        }

        const section = (title) => {
          ensureSpace(120) // besoin d'au moins 120px pour titre + début de contenu
          if (doc.y > 60) doc.moveDown(0.4)
          doc.fontSize(13).fillColor(C_NAVY).font('Helvetica-Bold').text(title)
          doc.moveDown(0.2)
          doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C_BRAND).lineWidth(1.5).stroke()
          doc.moveDown(0.3)
        }

        const kvLine = (label, value) => {
          doc.fontSize(10).fillColor(C_GRAY).font('Helvetica-Bold').text(`${label} : `, { continued: true })
            .font('Helvetica').fillColor(C_DARK).text(value)
        }

        const smallText = (text, opts = {}) => {
          doc.fontSize(9).fillColor(C_DARK).font('Helvetica').text(text, opts)
        }

        // Count total questions across all blocks
        let totalQuestions = 0
        for (const b of study.blocks) {
          if (b.type === 'QUESTION') totalQuestions += (b.questions || []).length
        }

        // ══════════════════════════════════════════════════════════════════
        // PAGE 1 : COVER
        // ══════════════════════════════════════════════════════════════════
        doc.rect(0, 0, 595, 8).fill(C_BRAND)
        doc.moveDown(2)
        doc.fontSize(28).fillColor(C_BRAND).font('Helvetica-Bold')
          .text('Codebook MindCraft', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(16).fillColor(C_NAVY).font('Helvetica')
          .text(study.name, { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(10).fillColor(C_GRAY)
          .text(
            `Version ${study.version}  ·  Statut : ${STATUS_FR[study.status] || study.status}  ·  ${sessions.length} participant(s)  ·  Généré le ${new Date().toLocaleDateString('fr-FR')}`,
            { align: 'center' },
          )
        doc.moveDown(1.5)
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C_BRAND).lineWidth(1).stroke()
        doc.moveDown(0.8)

        // ══════════════════════════════════════════════════════════════════
        // SECTION 1 : Métadonnées de l'étude
        // ══════════════════════════════════════════════════════════════════
        section('1. Métadonnées de l\'étude')
        kvLine('Nom', study.name)
        kvLine('Version', String(study.version))
        kvLine('Statut', STATUS_FR[study.status] || study.status)
        kvLine('Nombre de blocs', String(study.blocks.length))
        kvLine('Nombre de questions', String(totalQuestions))
        kvLine('Participants', String(sessions.length))

        // ══════════════════════════════════════════════════════════════════
        // SECTION 2 : Design expérimental
        // ══════════════════════════════════════════════════════════════════
        if (study.design) {
          const d = study.design
          section('2. Design expérimental')
          kvLine('Type', DESIGN_TYPE_FR[d.designType] || d.designType)
          kvLine('Contrebalancement', COUNTERBALANCE_FR[d.counterbalanceMethod] || d.counterbalanceMethod)
          kvLine('Mode de quotas', QUOTA_FR[d.quotaMode] || d.quotaMode)
          kvLine('N cible', String(d.targetN))
          doc.moveDown(0.6)

          for (const factor of d.factors) {
            ensureSpace()
            doc.fontSize(11).fillColor(C_NAVY).font('Helvetica-Bold')
              .text(`Facteur : ${factor.name}`)
            doc.fontSize(9).fillColor(C_GRAY).font('Helvetica')
              .text(`Type : ${DESIGN_TYPE_FR[factor.type] || factor.type}`, { indent: 16 })
            doc.moveDown(0.2)
            for (const level of factor.levels) {
              doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                .text(`  [${level.code}]  ${level.name}`, { indent: 16 })
            }
            doc.moveDown(0.5)
          }

          // Participant counts per condition
          const condCounts = {}
          for (const s of sessions) {
            const key = s.conditionAssignments
              .map((ca) => `${ca.factorLevel.factor.name}=${ca.factorLevel.code}`)
              .sort()
              .join(' × ')
            if (key) condCounts[key] = (condCounts[key] || 0) + 1
          }
          if (Object.keys(condCounts).length > 0) {
            ensureSpace()
            doc.fontSize(10).fillColor(C_NAVY).font('Helvetica-Bold').text('Participants par condition :')
            doc.moveDown(0.2)
            for (const [cond, count] of Object.entries(condCounts)) {
              doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                .text(`  ${cond}  :  ${count} participant(s)`, { indent: 16 })
            }
            doc.moveDown(0.5)
          }

          // Condition matrix (cartesian product)
          if (d.factors.length > 0) {
            ensureSpace()
            doc.fontSize(10).fillColor(C_NAVY).font('Helvetica-Bold').text('Matrice des conditions :')
            doc.moveDown(0.3)
            let combinations = [[]]
            for (const factor of d.factors) {
              const next = []
              for (const combo of combinations) {
                for (const level of factor.levels) {
                  next.push([...combo, { factor: factor.name, code: level.code, name: level.name }])
                }
              }
              combinations = next
            }
            doc.fontSize(9).fillColor(C_GRAY).font('Helvetica')
              .text(`Nombre total de conditions : ${combinations.length}`)
            doc.moveDown(0.2)
            for (let ci = 0; ci < combinations.length; ci++) {
              ensureSpace(60)
              const label = combinations[ci].map((c) => `${c.factor}=${c.code}`).join(' × ')
              doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                .text(`  ${ci + 1}. ${label}`, { indent: 16 })
            }
            doc.moveDown(0.5)
          }
        }

        // ══════════════════════════════════════════════════════════════════
        // SECTION 3 : Métadonnées Open Science
        // ══════════════════════════════════════════════════════════════════
        const openScienceFields = [
          ['preregistrationUrl', 'URL de pré-enregistrement'],
          ['preregistrationPlatform', 'Plateforme de pré-enregistrement'],
          ['ethicsApproval', 'Approbation éthique'],
          ['ethicsCommittee', 'Comité d\'éthique'],
          ['ethicsNumber', 'Numéro d\'approbation éthique'],
          ['funding', 'Financement'],
          ['doi', 'DOI'],
          ['dataAvailability', 'Disponibilité des données'],
          ['conflictOfInterest', 'Conflit d\'intérêts'],
        ]
        const studyMeta = typeof study.metadata === 'string' ? JSON.parse(study.metadata) : study.metadata
        if (studyMeta && typeof studyMeta === 'object' && Object.keys(studyMeta).length > 0) {
          const presentFields = openScienceFields.filter(([key]) => studyMeta[key])
          if (presentFields.length > 0) {
            section('3. Métadonnées Open Science')
            for (const [key, label] of presentFields) {
              kvLine(label, String(studyMeta[key]))
            }
          }
        }

        // ══════════════════════════════════════════════════════════════════
        // SECTION 4 : Matériel de l'étude — bloc par bloc
        // ══════════════════════════════════════════════════════════════════
        section('4. Matériel de l\'étude')

        for (let bi = 0; bi < study.blocks.length; bi++) {
          const block = study.blocks[bi]
          const blockSettings = parseSettings(block.settings)
          const blockName = blockSettings.name || block.label || `Bloc ${block.order + 1}`
          const typeFr = BLOCK_TYPE_FR[block.type] || block.type
          const blockNum = bi + 1

          ensureSpace()

          // ── WELCOME / INSTRUCTION / DEBRIEFING ────────────────────────
          if (['WELCOME', 'INSTRUCTION', 'DEBRIEFING'].includes(block.type)) {
            doc.fontSize(11).fillColor(C_BRAND).font('Helvetica-Bold')
              .text(`Bloc ${blockNum} — ${typeFr} : ${blockName}`)
            doc.moveDown(0.3)
            const content = stripHtml(blockSettings.content || blockSettings.text || blockSettings.message || '')
            if (content) {
              doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                .text(content.substring(0, 200) + (content.length > 200 ? '...' : ''), { indent: 14 })
            }
            doc.moveDown(0.4)
          }

          // ── QUESTION block ────────────────────────────────────────────
          else if (block.type === 'QUESTION') {
            doc.fontSize(11).fillColor(C_BRAND).font('Helvetica-Bold')
              .text(`Bloc ${blockNum} — Questionnaire : ${blockName}`)
            doc.moveDown(0.4)

            // Determine question order: use _questionOrder if available
            const questionOrder = blockSettings._questionOrder
            let orderedQuestions
            if (Array.isArray(questionOrder) && questionOrder.length > 0) {
              const qMap = {}
              for (const q of block.questions) qMap[q.id] = q
              orderedQuestions = questionOrder.map((qid) => qMap[qid]).filter(Boolean)
              // Append any questions not in the order array
              const inOrder = new Set(questionOrder)
              for (const q of block.questions) {
                if (!inOrder.has(q.id)) orderedQuestions.push(q)
              }
            } else {
              orderedQuestions = [...block.questions].sort((a, b) => a.order - b.order)
            }

            for (const q of orderedQuestions) {
              ensureSpace(100)
              const qSettings = parseSettings(q.settings)
              const typeFrQ = QUESTION_TYPE_FR[q.type] || q.type
              const questionText = stripHtml(q.text)

              // Question header
              doc.fontSize(10).fillColor(C_TEAL).font('Helvetica-Bold')
                .text(`Q: ${q.code || '—'} — ${typeFrQ}`)
              if (questionText) {
                doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                  .text(questionText, { indent: 14 })
              }
              if (q.required) {
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica-Oblique')
                  .text('(Obligatoire)', { indent: 14 })
              }

              // ── Type-specific details ─────────────────────────────────
              const choiceTypes = ['RADIO', 'CHECKBOX', 'SELECT', 'BUTTON_GROUP', 'RADIO_COMMENT', 'CHECKBOX_COMMENT', 'RANKING', 'DRILL_DOWN', 'CONSENT']
              if (choiceTypes.includes(q.type) && q.choices?.length > 0) {
                doc.moveDown(0.2)
                for (const c of q.choices) {
                  doc.fontSize(8.5).fillColor(C_DARK).font('Helvetica')
                    .text(`${c.code}. ${c.label}${c.anchored ? '  (ancré)' : ''}`, { indent: 28 })
                }
              }

              if (['MEDIA_RADIO', 'MEDIA_CHECKBOX'].includes(q.type) && q.choices?.length > 0) {
                doc.moveDown(0.2)
                for (const c of q.choices) {
                  const mediaInfo = c.mediaUrl ? ` (Fichier : ${c.mediaUrl.split('/').pop()})` : ''
                  doc.fontSize(8.5).fillColor(C_DARK).font('Helvetica')
                    .text(`${c.code}. ${c.label}${mediaInfo}`, { indent: 28 })
                }
              }

              if (['MATRIX', 'SIDE_BY_SIDE'].includes(q.type) && q.matrixItems?.length > 0) {
                doc.moveDown(0.2)
                const matrixStart = qSettings.startFrom ?? 1
                const matrixCols = qSettings.columns || 5
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                  .text(`Échelle : ${matrixStart} à ${matrixStart + matrixCols - 1}`, { indent: 14 })
                const hasReversed = q.matrixItems.some((it) => it.reversed)
                if (hasReversed) {
                  doc.fontSize(8).fillColor(C_GRAY).font('Helvetica-Oblique')
                    .text('Note : le suffixe _R signale un item inversé. La valeur exportée reste la valeur brute (non recodée).', { indent: 14 })
                }
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica-Bold').text('Items :', { indent: 14 })
                for (const item of q.matrixItems) {
                  const rSuffix = item.reversed ? '_R' : ''
                  doc.fontSize(8.5).fillColor(C_DARK).font('Helvetica')
                    .text(`${item.code}. ${item.label}${item.reversed ? '  (inversé)' : ''}  →  export : ${q.code}_${item.code}${rSuffix}`, { indent: 28 })
                }
              }

              if (q.type === 'SEMANTIC_DIFF' && q.matrixItems?.length > 0) {
                doc.moveDown(0.2)
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica-Bold').text('Items :', { indent: 14 })
                for (const item of q.matrixItems) {
                  const left = item.leftLabel || item.label || ''
                  const right = item.rightLabel || ''
                  doc.fontSize(8.5).fillColor(C_DARK).font('Helvetica')
                    .text(`${item.code}. ${left} ←→ ${right}`, { indent: 28 })
                }
              }

              if (q.type === 'LIKERT') {
                const startFrom = qSettings.startFrom ?? 1
                const points = qSettings.points || 5
                const min = qSettings.min ?? startFrom
                const max = qSettings.max ?? (startFrom + points - 1)
                const left = qSettings.leftLabel || (qSettings.pointLabels?.[0] || '')
                const right = qSettings.rightLabel || (qSettings.pointLabels?.[points - 1] || '')
                const scaleText = left && right ? `${min} (${left}) à ${max} (${right})` : `${min} à ${max}`
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                  .text(`Échelle : ${scaleText}`, { indent: 14 })
              }

              if (q.type === 'SLIDER') {
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                  .text(`Min: ${qSettings.min ?? 0} — Max: ${qSettings.max ?? 100} — Pas: ${qSettings.step ?? 1}`, { indent: 14 })
              }

              if (q.type === 'CONSTANT_SUM') {
                const total = qSettings.total ?? qSettings.sum ?? '?'
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                  .text(`Total : ${total}`, { indent: 14 })
                if (q.choices?.length > 0) {
                  for (const c of q.choices) {
                    doc.fontSize(8.5).fillColor(C_DARK).font('Helvetica')
                      .text(`${c.code}. ${c.label}`, { indent: 28 })
                  }
                }
              }

              if (q.type === 'COMPUTED') {
                const formula = qSettings.formula || qSettings.expression || ''
                const vars = qSettings.variables || qSettings.refs || ''
                if (formula) {
                  doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                    .text(`Formule : ${formula}`, { indent: 14 })
                }
                if (vars) {
                  doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                    .text(`Variables : ${typeof vars === 'object' ? JSON.stringify(vars) : vars}`, { indent: 14 })
                }
              }

              if (['FILL_BLANK', 'DROP_WORD'].includes(q.type)) {
                const passage = qSettings.passage || qSettings.text || ''
                if (passage) {
                  const cleaned = stripHtml(passage).replace(/\{\{[^}]*\}\}/g, '[BLANK]')
                  doc.fontSize(8.5).fillColor(C_DARK).font('Helvetica')
                    .text(cleaned.substring(0, 300), { indent: 14 })
                }
              }

              if (['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO'].includes(q.type)) {
                const url = qSettings.url || qSettings.src || qSettings.mediaUrl || ''
                const caption = qSettings.caption || ''
                const parts = []
                if (url) parts.push(`URL : ${url}`)
                if (caption) parts.push(`Légende : ${caption}`)
                if (parts.length > 0) {
                  doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                    .text(parts.join('  ·  '), { indent: 14 })
                } else {
                  const typeLabel = { DISPLAY: 'texte', IMAGE: 'image', AUDIO: 'audio', VIDEO: 'vidéo' }[q.type]
                  doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica')
                    .text(`Affichage ${typeLabel}`, { indent: 14 })
                }
              }

              if (['TIMING', 'META_INFO'].includes(q.type)) {
                doc.fontSize(8.5).fillColor(C_GRAY).font('Helvetica-Oblique')
                  .text('Collecte automatique (invisible)', { indent: 14 })
              }

              doc.moveDown(0.5)
            }
            doc.moveDown(0.3)
          }

          // ── STIMULUS (Tâche) block ────────────────────────────────────
          else if (block.type === 'STIMULUS') {
            doc.fontSize(11).fillColor(C_BRAND).font('Helvetica-Bold')
              .text(`Bloc ${blockNum} — Tâche : ${blockName}`)
            doc.moveDown(0.3)

            // External vs internal
            if (blockSettings.external || blockSettings.externalUrl) {
              kvLine('URL', blockSettings.externalUrl || blockSettings.url || '—')
              kvLine('Mode', blockSettings.mode || 'iframe')
            } else {
              const files = block.stimulusFiles || []
              const categories = [...new Set(files.map((f) => f.category).filter(Boolean))]
              const catStr = categories.length > 0 ? ` (catégories : ${categories.join(', ')})` : ''
              doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                .text(`Nombre de stimuli : ${files.length}${catStr}`, { indent: 14 })
              doc.moveDown(0.2)

              // List stimuli
              for (let fi = 0; fi < files.length; fi++) {
                ensureSpace(60)
                const f = files[fi]
                const catLabel = f.category ? ` (catégorie : ${f.category})` : ''
                const isText = f.mimetype && f.mimetype.startsWith('text/')
                const displayName = isText ? (f.originalName || f.filename) : (f.originalName || f.filename)
                doc.fontSize(8.5).fillColor(C_DARK).font('Helvetica')
                  .text(`${fi + 1}. ${displayName}${catLabel}`, { indent: 28 })
              }
              doc.moveDown(0.3)

              // Sequence steps
              const steps = block.sequenceSteps || []
              if (steps.length > 0) {
                doc.fontSize(10).fillColor(C_NAVY).font('Helvetica-Bold').text('Séquence d\'essai :', { indent: 14 })
                doc.moveDown(0.2)
                for (const step of steps) {
                  ensureSpace(60)
                  const ss = parseSettings(step.settings)
                  const stepNum = step.order + 1
                  let desc = ''

                  switch (step.type) {
                    case 'FIXATION': {
                      const durMin = ss.durationMin || ss.duration || 400
                      const durMax = ss.durationMax || ss.duration || 700
                      desc = durMin === durMax
                        ? `Point de fixation (+) — durée : ${durMin} ms`
                        : `Point de fixation (+) — durée : ${durMin}-${durMax} ms`
                      break
                    }
                    case 'STIMULUS': {
                      const dur = ss.duration || ss.timeout
                      desc = dur ? `Affichage du stimulus — durée : ${dur} ms` : 'Affichage du stimulus — durée : jusqu\'à la réponse'
                      break
                    }
                    case 'RESPONSE_KEY': {
                      const keys = ss.keys || ss.keyMapping || {}
                      const keyDescs = Object.entries(keys).map(([k, v]) => `Touche ${k} = ${v}`).join(', ')
                      const timeout = ss.timeout || ss.maxDuration || ''
                      desc = `Capture de la réponse${keyDescs ? ` — ${keyDescs}` : ''}${timeout ? ` — délai max : ${timeout} ms` : ''}`
                      break
                    }
                    case 'FEEDBACK': {
                      const dur = ss.duration || 600
                      const labels = []
                      if (ss.correctLabel !== undefined || ss.correct !== undefined) labels.push(`✓ (${ss.correctLabel || 'correct'})`)
                      if (ss.incorrectLabel !== undefined || ss.incorrect !== undefined) labels.push(`✗ (${ss.incorrectLabel || 'incorrect'})`)
                      if (ss.timeoutLabel !== undefined || ss.timeout !== undefined) labels.push(`${ss.timeoutLabel || 'Trop lent !'}  (timeout)`)
                      desc = labels.length > 0
                        ? `Feedback — ${labels.join(', ')} — durée : ${dur} ms`
                        : `Feedback — durée : ${dur} ms`
                      break
                    }
                    case 'ITI': {
                      const durMin = ss.durationMin || ss.duration || 300
                      const durMax = ss.durationMax || ss.duration || 500
                      desc = durMin === durMax
                        ? `Intervalle inter-essais — durée : ${durMin} ms`
                        : `Intervalle inter-essais — durée : ${durMin}-${durMax} ms`
                      break
                    }
                    default: {
                      const details = Object.entries(ss)
                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                        .join(', ')
                      desc = `${step.type}${details ? ' — ' + details : ''}`
                    }
                  }
                  doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                    .text(`${stepNum}. ${desc}`, { indent: 28 })
                }
                doc.moveDown(0.3)
              }

              // Settings
              if (blockSettings.repetitions != null) kvLine('Répétitions', String(blockSettings.repetitions))
              if (blockSettings.randomize != null) kvLine('Randomisation', blockSettings.randomize ? 'Oui' : 'Non')
              if (blockSettings.practiceTrials != null) kvLine('Essais de pratique', String(blockSettings.practiceTrials))
            }

            doc.moveDown(0.4)
          }

          // ── LOGIC block ───────────────────────────────────────────────
          else if (block.type === 'LOGIC') {
            doc.fontSize(11).fillColor(C_BRAND).font('Helvetica-Bold')
              .text(`Bloc ${blockNum} — Logique : ${blockName}`)
            doc.moveDown(0.3)
            const rules = blockSettings.rules || blockSettings.conditions || []
            if (Array.isArray(rules) && rules.length > 0) {
              const OPERATOR_FR = { equals: 'est égal à', not_equals: 'est différent de', contains: 'contient', gt: 'est supérieur à', lt: 'est inférieur à', gte: '≥', lte: '≤' }
              const ACTION_FR = { skip_to: 'Sauter vers', end_study: 'Terminer l\'étude', skip_next: 'Sauter le bloc suivant', continue: 'Continuer' }

              for (let ri = 0; ri < rules.length; ri++) {
                const rule = rules[ri]
                ensureSpace(80)

                // Titre de la règle
                const ruleLabel = rule.label || `Règle ${ri + 1}`
                doc.fontSize(10).fillColor(C_NAVY).font('Helvetica-Bold')
                  .text(`Règle ${ri + 1} : ${ruleLabel}`, { indent: 10 })
                doc.moveDown(0.2)

                // Type de condition
                const typeLabel = rule.type === 'response' ? 'Basée sur la réponse du participant' : rule.type === 'condition' ? 'Basée sur la condition expérimentale (intersujet)' : rule.type || '—'
                doc.fontSize(9).fillColor(C_GRAY).font('Helvetica')
                  .text(`Type : ${typeLabel}`, { indent: 20 })

                // Condition
                const source = rule.sourceCode === '_condition' ? 'Condition expérimentale' : `Variable « ${rule.sourceCode} »`
                const op = OPERATOR_FR[rule.operator] || rule.operator || '='
                doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                  .text(`Si ${source} ${op} « ${rule.value} »`, { indent: 20 })

                // Action
                const action = ACTION_FR[rule.action] || rule.action || '—'
                let actionText = action
                if (rule.action === 'skip_to' && rule.targetBlockId) {
                  const targetBlock = study.blocks.find((b) => b.id === rule.targetBlockId)
                  const targetSettings = typeof targetBlock?.settings === 'string' ? JSON.parse(targetBlock.settings) : (targetBlock?.settings || {})
                  const targetName = targetSettings.name || targetBlock?.label || BLOCK_TYPE_FR[targetBlock?.type] || 'bloc inconnu'
                  actionText = `${action} le bloc « ${targetName} »`
                }
                doc.fontSize(9).fillColor(C_DARK).font('Helvetica')
                  .text(`Alors : ${actionText}`, { indent: 20 })

                // Description
                if (rule.description) {
                  doc.fontSize(8).fillColor(C_GRAY).font('Helvetica-Oblique')
                    .text(rule.description, { indent: 20 })
                }

                doc.moveDown(0.4)
              }
            } else {
              doc.fontSize(9).fillColor(C_GRAY).font('Helvetica-Oblique')
                .text('Aucune règle définie.', { indent: 14 })
            }
            doc.moveDown(0.4)
          }
        }

        // ══════════════════════════════════════════════════════════════════
        // SECTION 5 : Structure des fichiers exportés
        // ══════════════════════════════════════════════════════════════════
        ensureSpace()
        section('5. Structure des fichiers exportés')

        doc.fontSize(11).fillColor(C_NAVY).font('Helvetica-Bold').text('CSV Questionnaire')
        doc.moveDown(0.3)
        for (const col of ['participantId', 'status', 'allocatedAt', 'condition_*', '...questionCodes']) {
          smallText(`  ${col}`, { indent: 14 })
        }
        doc.moveDown(0.6)

        doc.fontSize(11).fillColor(C_NAVY).font('Helvetica-Bold').text('CSV Essais RT')
        doc.moveDown(0.3)
        for (const col of ['participantId', 'condition_*', 'blockId', 'trialIndex', 'stimulusFile', 'stimulusCategory', 'keyPressed', 'correct', 'rtMs', 'response']) {
          smallText(`  ${col}`, { indent: 14 })
        }
        doc.moveDown(0.6)

        doc.fontSize(11).fillColor(C_NAVY).font('Helvetica-Bold').text('Excel (.xlsx)')
        doc.moveDown(0.3)
        for (const sheet of ['Sessions — une ligne par session participante', 'Questions — format large, une colonne par question', 'Essais RT — une ligne par essai']) {
          smallText(`  ${sheet}`, { indent: 14 })
        }
        doc.moveDown(0.6)

        doc.fontSize(9).fillColor(C_GRAY).font('Helvetica-Oblique')
          .text('Note : Les valeurs complexes (réponses matricielles, choix multiples) sont encodées en JSON dans la colonne « value ». '
            + 'Les tableaux sont sérialisés sous forme de tableaux JSON (["a","b"]) et les objets sous forme d\'objets JSON ({"item1":3,"item2":5}).', { indent: 0 })

        // ══════════════════════════════════════════════════════════════════
        // SECTION 6 : Annexe — Résumé des variables
        // ══════════════════════════════════════════════════════════════════
        const allQuestions = []
        for (const block of study.blocks) {
          if (block.type === 'QUESTION' && block.questions) {
            const bs = parseSettings(block.settings)
            const questionOrder = bs._questionOrder
            let ordered
            if (Array.isArray(questionOrder) && questionOrder.length > 0) {
              const qMap = {}
              for (const q of block.questions) qMap[q.id] = q
              ordered = questionOrder.map((qid) => qMap[qid]).filter(Boolean)
              const inOrder = new Set(questionOrder)
              for (const q of block.questions) {
                if (!inOrder.has(q.id)) ordered.push(q)
              }
            } else {
              ordered = [...block.questions].sort((a, b) => a.order - b.order)
            }
            for (const q of ordered) allQuestions.push(q)
          }
        }

        if (allQuestions.length > 0) {
          ensureSpace()
          section('6. Annexe — Résumé des variables')

          const colX = [50, 140, 250, 310]
          const colW = [90, 110, 60, 235]

          const drawTableHeader = () => {
            doc.fontSize(9).font('Helvetica-Bold')
            doc.rect(50, doc.y, W, 18).fill(C_NAVY)
            const hy = doc.y + 5
            doc.fillColor('#ffffff')
            doc.text('Code', colX[0] + 4, hy, { width: colW[0], align: 'left' })
            doc.text('Type', colX[1] + 4, hy, { width: colW[1], align: 'left' })
            doc.text('Obligatoire', colX[2] + 4, hy, { width: colW[2], align: 'left' })
            doc.text('Description', colX[3] + 4, hy, { width: colW[3], align: 'left' })
            doc.y = hy + 18
          }

          drawTableHeader()

          for (let qi = 0; qi < allQuestions.length; qi++) {
            const q = allQuestions[qi]
            if (doc.y > 750) {
              doc.addPage()
              drawTableHeader()
            }

            // Description: stripped text or type-based fallback
            let desc = stripHtml(q.text).substring(0, 60)
            if (!desc) {
              const displayTypes = ['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO']
              if (displayTypes.includes(q.type)) {
                const typeLabel = { DISPLAY: 'texte', IMAGE: 'image', AUDIO: 'audio', VIDEO: 'vidéo' }[q.type]
                desc = `Affichage ${typeLabel}`
              } else {
                desc = QUESTION_TYPE_FR[q.type] || q.type
              }
            }

            const rowColor = qi % 2 === 0 ? '#f9fafb' : '#ffffff'
            const rowY = doc.y
            doc.rect(50, rowY, W, 16).fill(rowColor)
            doc.fontSize(8).fillColor(C_DARK).font('Helvetica')
            doc.text(q.code || '', colX[0] + 4, rowY + 4, { width: colW[0], align: 'left' })
            doc.text(QUESTION_TYPE_FR[q.type] || q.type, colX[1] + 4, rowY + 4, { width: colW[1], align: 'left' })
            doc.text(q.required ? 'Oui' : 'Non', colX[2] + 4, rowY + 4, { width: colW[2], align: 'left' })
            doc.text(desc, colX[3] + 4, rowY + 4, { width: colW[3], align: 'left' })
            doc.y = rowY + 16
          }
        }

        // ══════════════════════════════════════════════════════════════════
        // FOOTER on each page
        // Pas de footer post-hoc (évite les pages blanches liées à bufferPages)

        doc.end()
      }) // end Promise
    } catch (err) {
      fastify.log.error({ msg: 'Codebook generation error', err: err.message, stack: err.stack })
      return reply.status(500).send({ error: err.message })
    }
  })
}
