// SPDX-License-Identifier: AGPL-3.0-or-later
const sanitizeHtml = require('sanitize-html')

const SANITIZE_OPTIONS = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'span', 'blockquote', 'code', 'pre', 'sub', 'sup'],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    'span': ['style'],
    'p': ['style'],
    'h1': ['style'],
    'h2': ['style'],
    'h3': ['style'],
  },
  allowedStyles: {
    '*': {
      'color': [/^rgb\(/, /^#/],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-size': [/^\d+(?:\.\d+)?px$/],
      'font-style': [/^italic$/],
      'text-decoration': [/^underline$/],
    }
  },
}

function sanitize(text) {
  if (!text) return text
  return sanitizeHtml(text, SANITIZE_OPTIONS)
}

const BLOCK_LABELS = {
  WELCOME: 'Accueil', INSTRUCTION: 'Instruction', QUESTION: 'Questionnaire',
  STIMULUS: 'Tâche', LOGIC: 'Logique', DEBRIEFING: 'Message de fin',
}

async function studyRoutes(fastify) {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)

  // ── Créer une étude ────────────────────────────────────────────────────────
  fastify.post('/', async (req, reply) => {
    const { projectId, name, description } = req.body
    const userId = req.user.id

    if (!name || !projectId) return reply.status(400).send({ error: 'Nom et projectId requis.' })

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return reply.status(404).send({ error: 'Projet introuvable.' })

    const study = await prisma.study.create({
      data: { name, description, projectId },
    })

    // Snapshot initiale vide
    await prisma.studyVersion.create({
      data: { studyId: study.id, version: 1, snapshot: { blocks: [] } },
    })

    await logActivity(prisma, userId, projectId, 'STUDY_CREATED', `Étude "${name}" créée`)

    return reply.status(201).send({ study })
  })

  // ── Lister les études accessibles (pour les sélecteurs : copie de bloc
  //    vers une autre étude, etc.) ───────────────────────────────────────────
  fastify.get('/', async (req, reply) => {
    const userId = req.user.id
    const studies = await prisma.study.findMany({
      where: { project: { is: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } },
      select: { id: true, name: true, status: true, project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    return reply.send({ studies })
  })

  // ── Récupérer une étude avec ses blocs ────────────────────────────────────
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params

    const study = await prisma.study.findFirst({
      where: {
        id,
        project: {
          is: {
            OR: [
              { ownerId: req.user.id },
              { collaborators: { some: { userId: req.user.id } } }
            ]
          }
        }
      },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                choices:     { orderBy: { order: 'asc' } },
                matrixItems: { orderBy: { order: 'asc' } },
                conditions:  true,
              },
            },
          },
        },
        project: { select: { id: true, name: true, ownerId: true } },
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

    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })
    return reply.send({ study })
  })

  // ── Modifier les métadonnées d'une étude ─────────────────────────────────
  fastify.patch('/:id', async (req, reply) => {
    const { id } = req.params
    const { name, description, metadata } = req.body

    const study = await prisma.study.findFirst({
      where: { id, project: { is: { OR: [{ ownerId: req.user.id }, { collaborators: { some: { userId: req.user.id } } }] } } },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const updated = await prisma.study.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(metadata !== undefined && { metadata }),
      },
    })

    return reply.send({ study: updated })
  })

  // ── Supprimer une étude ───────────────────────────────────────────────────
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    const study = await prisma.study.findUnique({
      where: { id },
      include: { project: true },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (study.project.ownerId !== userId) {
      return reply.status(403).send({ error: 'Seul le propriétaire peut supprimer cette étude.' })
    }

    await prisma.study.delete({ where: { id } })
    await logActivity(prisma, userId, study.projectId, 'STUDY_DELETED', `Étude "${study.name}" supprimée`)

    return reply.send({ message: 'Étude supprimée.' })
  })

  // ── Compter les sessions de participation d'une étude ────────────────────
  // Sert à la modal de confirmation « Réinitialiser les données » pour afficher
  // précisément le nombre de sessions qui seront supprimées avant confirmation.
  fastify.get('/:id/sessions/count', async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    const study = await prisma.study.findFirst({
      where: { id, project: { is: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } },
      select: { id: true },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const count = await prisma.participantSession.count({ where: { studyId: id } })
    return reply.send({ count })
  })

  // ── Réinitialiser les données d'une étude (sessions + réponses) ──────────
  // Supprime toutes les ParticipantSession de l'étude. Les QuestionResponse,
  // StimulusResponse et autres enfants sont supprimés en cascade via le schéma
  // Prisma (onDelete: Cascade). L'étude elle-même (blocs, questions, design)
  // est conservée — seules les données collectées sont effacées.
  //
  // Disponible dans tous les statuts (Brouillon / Validée / En collecte /
  // Archivée). En collecte ou Archivée, le frontend impose une confirmation
  // renforcée (saisie du nom de l'étude). Côté serveur, on accepte la requête
  // dans tous les cas et on journalise systématiquement l'action.
  //
  // Seul·e le·la propriétaire du projet peut réinitialiser (pas les
  // collaborateur·rice·s EDITOR/VIEWER), par symétrie avec la suppression
  // de l'étude.
  fastify.delete('/:id/sessions', async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    const study = await prisma.study.findUnique({
      where: { id },
      include: { project: true },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (study.project.ownerId !== userId) {
      return reply.status(403).send({ error: 'Seul le propriétaire peut réinitialiser les données.' })
    }

    const result = await prisma.participantSession.deleteMany({ where: { studyId: id } })
    await logActivity(
      prisma, userId, study.projectId, 'STUDY_DATA_RESET',
      `Données réinitialisées sur "${study.name}" (${result.count} session${result.count > 1 ? 's' : ''} supprimée${result.count > 1 ? 's' : ''}, statut au moment du reset : ${study.status})`,
    )

    return reply.send({ deleted: result.count })
  })

  // ── Modifier le statut d'une étude ────────────────────────────────────────
  fastify.patch('/:id/status', async (req, reply) => {
    const { id } = req.params
    const { status } = req.body
    const userId = req.user.id

    const study = await prisma.study.findFirst({
      where: { id, project: { is: { OR: [{ ownerId: req.user.id }, { collaborators: { some: { userId: req.user.id } } }] } } },
      include: { project: true },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const updated = await prisma.study.update({
      where: { id },
      data: { status },
    })

    await logActivity(prisma, userId, study.projectId, 'STUDY_STATUS_CHANGED', `Étude "${study.name}" → ${status}`)
    return reply.send({ study: updated })
  })

  // ── Ajouter un bloc ───────────────────────────────────────────────────────
  fastify.post('/:id/blocks', async (req, reply) => {
    const { id } = req.params
    const { type, settings } = req.body
    const userId = req.user.id

    const study = await prisma.study.findFirst({
      where: { id, project: { is: { OR: [{ ownerId: req.user.id }, { collaborators: { some: { userId: req.user.id } } }] } } },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    // Calculer l'ordre (dernier + 1)
    const lastBlock = await prisma.block.findFirst({
      where: { studyId: id },
      orderBy: { order: 'desc' },
    })
    const order = (lastBlock?.order ?? -1) + 1

    const block = await prisma.block.create({
      data: { type, order, settings: settings || {}, studyId: id },
      include: { questions: true },
    })

    await saveVersion(prisma, id)
    await logActivity(prisma, userId, study.projectId, 'BLOCK_ADDED', `Bloc "${BLOCK_LABELS[type] || type}" ajouté`)

    return reply.status(201).send({ block })
  })

  // ── Modifier un bloc ──────────────────────────────────────────────────────
  fastify.put('/:id/blocks/:blockId', async (req, reply) => {
    const { id, blockId } = req.params
    const { settings, label } = req.body

    // Verify ownership
    const study = await prisma.study.findFirst({
      where: { id, project: { is: { OR: [{ ownerId: req.user.id }, { collaborators: { some: { userId: req.user.id } } }] } } },
    })
    if (!study) return reply.status(403).send({ error: 'Accès refusé.' })

    // Sanitize content in block settings (welcome, instruction, debriefing)
    if (settings && settings.content) {
      settings.content = sanitize(settings.content)
    }

    const block = await prisma.block.update({
      where: { id: blockId },
      data: {
        settings,
        ...(label !== undefined && { label }),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: true, matrixItems: true, conditions: true },
        },
      },
    })

    await saveVersion(prisma, req.params.id)
    return reply.send({ block })
  })

  // ── Supprimer un bloc ─────────────────────────────────────────────────────
  fastify.delete('/:id/blocks/:blockId', async (req, reply) => {
    const { id, blockId } = req.params
    const userId = req.user.id

    const block = await prisma.block.findUnique({
      where: { id: blockId },
      include: { study: { include: { project: true } } },
    })
    if (!block) return reply.status(404).send({ error: 'Bloc introuvable.' })

    await prisma.block.delete({ where: { id: blockId } })

    // Nettoyer les blockIds orphelins dans les niveaux de facteur
    try {
      const design = await prisma.experimentalDesign.findUnique({
        where: { studyId: id },
        include: { factors: { include: { levels: true } } },
      })
      if (design) {
        for (const factor of design.factors) {
          for (const level of factor.levels) {
            const bIds = Array.isArray(level.blockIds) ? level.blockIds : JSON.parse(level.blockIds || '[]')
            if (bIds.includes(blockId)) {
              await prisma.factorLevel.update({
                where: { id: level.id },
                data: { blockIds: bIds.filter((bid) => bid !== blockId) },
              })
            }
          }
        }
      }
    } catch { /* ne pas bloquer la suppression */ }

    // Réordonner les blocs restants
    const remaining = await prisma.block.findMany({
      where: { studyId: id },
      orderBy: { order: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      await prisma.block.update({ where: { id: remaining[i].id }, data: { order: i } })
    }

    await saveVersion(prisma, id)
    await logActivity(prisma, userId, block.study.projectId, 'BLOCK_DELETED', `Bloc "${BLOCK_LABELS[block.type] || block.type}" supprimé`)

    return reply.send({ message: 'Bloc supprimé.' })
  })

  // ── Réordonner les blocs ──────────────────────────────────────────────────
  fastify.put('/:id/blocks/reorder', async (req, reply) => {
    const { id } = req.params
    const { order } = req.body // Array d'ids dans le nouvel ordre

    if (!Array.isArray(order)) return reply.status(400).send({ error: 'order doit être un tableau.' })

    await Promise.all(
      order.map((blockId, index) =>
        prisma.block.update({ where: { id: blockId }, data: { order: index } })
      )
    )

    await saveVersion(prisma, id)
    return reply.send({ message: 'Ordre mis à jour.' })
  })

  // ── Dupliquer un bloc ─────────────────────────────────────────────────────
  fastify.post('/:id/blocks/:blockId/duplicate', async (req, reply) => {
    const { id, blockId } = req.params
    const userId = req.user.id

    const study = await prisma.study.findFirst({
      where: { id, project: { is: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } },
    })
    if (!study) return reply.status(404).send({ error: 'Étude introuvable.' })

    const source = await prisma.block.findUnique({
      where: { id: blockId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: { orderBy: { order: 'asc' } }, matrixItems: { orderBy: { order: 'asc' } }, conditions: true },
        },
        stimulusFiles: { select: { id: true, filename: true, originalName: true, mimetype: true, size: true, url: true, data: true, category: true, createdAt: true, blockId: true } },
        sequenceSteps: { orderBy: { order: 'asc' } },
      },
    })
    if (!source || source.studyId !== id) return reply.status(404).send({ error: 'Bloc introuvable.' })

    // Calculer l'ordre (après le dernier bloc)
    const lastBlock = await prisma.block.findFirst({ where: { studyId: id }, orderBy: { order: 'desc' } })
    const newOrder = (lastBlock?.order ?? -1) + 1

    // Créer le bloc dupliqué
    const newBlock = await prisma.block.create({
      data: {
        type: source.type,
        label: source.label ? `${source.label} (copie)` : null,
        order: newOrder,
        settings: source.settings,
        studyId: id,
      },
    })

    // Dupliquer les questions avec leurs choix, items matriciels et conditions
    for (const q of source.questions) {
      const newQ = await prisma.question.create({
        data: {
          code: q.code ? `${q.code}_copy` : null,
          type: q.type,
          text: q.text,
          required: q.required,
          randomize: q.randomize,
          order: q.order,
          settings: q.settings,
          blockId: newBlock.id,
        },
      })

      if (q.choices.length > 0) {
        await prisma.choice.createMany({
          data: q.choices.map(c => ({
            code: c.code,
            label: c.label,
            order: c.order,
            anchored: c.anchored,
            mediaUrl: c.mediaUrl,
            mediaType: c.mediaType,
            questionId: newQ.id,
          })),
        })
      }

      if (q.matrixItems.length > 0) {
        await prisma.matrixItem.createMany({
          data: q.matrixItems.map(m => ({
            code: m.code,
            label: m.label,
            order: m.order,
            reversed: m.reversed,
            left: m.left,
            right: m.right,
            questionId: newQ.id,
          })),
        })
      }
    }

    // Dupliquer les étapes de séquence (trial sequence)
    if (source.sequenceSteps.length > 0) {
      await prisma.trialSequenceStep.createMany({
        data: source.sequenceSteps.map(s => ({
          type: s.type,
          order: s.order,
          settings: s.settings,
          blockId: newBlock.id,
        })),
      })
    }

    // Recharger le bloc avec toutes ses relations
    const result = await prisma.block.findUnique({
      where: { id: newBlock.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: true, matrixItems: true, conditions: true },
        },
        stimulusFiles: { select: { id: true, filename: true, originalName: true, mimetype: true, size: true, url: true, category: true, createdAt: true, blockId: true } },
        sequenceSteps: { orderBy: { order: 'asc' } },
      },
    })

    await saveVersion(prisma, id)
    await logActivity(prisma, userId, study.projectId, 'BLOCK_DUPLICATED', `Bloc "${BLOCK_LABELS[source.type] || source.type}" dupliqué`)

    return reply.status(201).send({ block: result })
  })

  // ── Copier un bloc vers une AUTRE étude ────────────────────────────────────
  // Permet de réutiliser un bloc (avec toutes ses questions, choix, items,
  // séquences et fichiers stimulus) dans une autre étude de l'utilisateur·rice.
  // Contrairement à la duplication intra-étude, on conserve les codes des
  // questions à l'identique : cela permet de réutiliser le même protocole d'une
  // étude à l'autre, et préserve les conditions d'affichage (qui référencent
  // les codes) ainsi que la cohérence des colonnes à l'export.
  fastify.post('/:id/blocks/:blockId/copy-to-study', async (req, reply) => {
    const { id, blockId } = req.params
    const { targetStudyId } = req.body || {}
    const userId = req.user.id

    if (!targetStudyId) return reply.status(400).send({ error: 'targetStudyId requis.' })
    if (targetStudyId === id) return reply.status(400).send({ error: 'Utilisez la duplication pour copier dans la même étude.' })

    const accessFilter = { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] }

    // Vérifier l'accès à l'étude source et à l'étude cible
    const sourceStudy = await prisma.study.findFirst({ where: { id, project: { is: accessFilter } } })
    if (!sourceStudy) return reply.status(404).send({ error: 'Étude source introuvable.' })
    const targetStudy = await prisma.study.findFirst({ where: { id: targetStudyId, project: { is: accessFilter } } })
    if (!targetStudy) return reply.status(403).send({ error: 'Étude cible introuvable ou non autorisée.' })

    const source = await prisma.block.findUnique({
      where: { id: blockId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: { orderBy: { order: 'asc' } }, matrixItems: { orderBy: { order: 'asc' } } },
        },
        stimulusFiles: { select: { filename: true, originalName: true, mimetype: true, size: true, url: true, data: true, category: true } },
        sequenceSteps: { orderBy: { order: 'asc' } },
      },
    })
    if (!source || source.studyId !== id) return reply.status(404).send({ error: 'Bloc introuvable.' })

    // Ordre = à la fin de l'étude cible
    const lastBlock = await prisma.block.findFirst({ where: { studyId: targetStudyId }, orderBy: { order: 'desc' } })
    const newOrder = (lastBlock?.order ?? -1) + 1

    const newBlock = await prisma.block.create({
      data: {
        type: source.type,
        label: source.label,
        order: newOrder,
        settings: source.settings,
        studyId: targetStudyId,
      },
    })

    // Questions (+ choix, items) — codes conservés à l'identique
    for (const q of source.questions) {
      const newQ = await prisma.question.create({
        data: {
          code: q.code,
          type: q.type,
          text: q.text,
          required: q.required,
          randomize: q.randomize,
          order: q.order,
          settings: q.settings,
          blockId: newBlock.id,
        },
      })
      if (q.choices.length > 0) {
        await prisma.choice.createMany({
          data: q.choices.map(c => ({ code: c.code, label: c.label, order: c.order, anchored: c.anchored, mediaUrl: c.mediaUrl, mediaType: c.mediaType, questionId: newQ.id })),
        })
      }
      if (q.matrixItems.length > 0) {
        await prisma.matrixItem.createMany({
          data: q.matrixItems.map(m => ({ code: m.code, label: m.label, order: m.order, reversed: m.reversed, left: m.left, right: m.right, questionId: newQ.id })),
        })
      }
    }

    // Étapes de séquence (tâche)
    if (source.sequenceSteps.length > 0) {
      await prisma.trialSequenceStep.createMany({
        data: source.sequenceSteps.map(s => ({ type: s.type, order: s.order, settings: s.settings, blockId: newBlock.id })),
      })
    }

    // Fichiers stimulus (avec les données binaires)
    for (const sf of source.stimulusFiles) {
      await prisma.stimulusFile.create({
        data: { filename: sf.filename, originalName: sf.originalName, mimetype: sf.mimetype, size: sf.size, url: sf.url, data: sf.data, category: sf.category, blockId: newBlock.id },
      })
    }

    await saveVersion(prisma, targetStudyId)
    await logActivity(prisma, userId, targetStudy.projectId, 'BLOCK_COPIED', `Bloc "${BLOCK_LABELS[source.type] || source.type}" copié depuis « ${sourceStudy.name} »`)

    return reply.status(201).send({ block: newBlock, targetStudyId })
  })

  // ── Dupliquer une étude entière ────────────────────────────────────────────
  fastify.post('/:id/duplicate', async (req, reply) => {
    const { id } = req.params
    const userId = req.user.id

    // Issue #83 relance (retour utilisateur·rice) : tri à deux clés sur tous
    // les enfants triables. Sans clé secondaire, si la source a des doublons
    // de `order` (race condition lors de la création de plusieurs questions
    // simultanées, ou ancien bug d'édition concurrente), Postgres renvoie
    // les rangs sur ties dans un ordre indéterminé. À la duplication, on
    // recopiait alors les questions dans cet ordre arbitraire — et la copie
    // semblait « mélangée » côté utilisateur·rice. On ajoute une clé
    // secondaire pour garantir un ordre déterministe : `createdAt` quand le
    // modèle le porte (Block, Question), `id` (UUID, donc stable) sinon
    // (Choice, MatrixItem, TrialSequenceStep n'ont pas de createdAt).
    const source = await prisma.study.findFirst({
      where: { id, project: { is: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } },
      include: {
        blocks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            questions: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
              include: {
                choices:     { orderBy: [{ order: 'asc' }, { id: 'asc' }] },
                matrixItems: { orderBy: [{ order: 'asc' }, { id: 'asc' }] },
                conditions:  true,
              },
            },
            stimulusFiles: { select: { id: true, filename: true, originalName: true, mimetype: true, size: true, url: true, data: true, category: true, blockId: true } },
            sequenceSteps: { orderBy: [{ order: 'asc' }, { id: 'asc' }] },
          },
        },
        design: {
          include: { factors: { orderBy: { order: 'asc' }, include: { levels: { orderBy: { order: 'asc' } } } } },
        },
      },
    })
    if (!source) return reply.status(404).send({ error: 'Étude introuvable.' })

    // Créer la nouvelle étude
    const newStudy = await prisma.study.create({
      data: {
        name: `${source.name} (copie)`,
        description: source.description,
        status: 'DRAFT',
        metadata: source.metadata,
        projectId: source.projectId,
      },
    })

    // Map ancien blockId → nouveau blockId (pour le design)
    const blockIdMap = {}

    // Dupliquer les blocs
    //
    // Issue #83 relance (retour utilisateur·rice) : auparavant, on recopiait
    // simplement le champ `order` de chaque bloc depuis la source. Si la
    // source avait des valeurs `order` cassées (doublons, trous, NULL héritées
    // d'éditions antérieures), la duplication héritait du problème — et
    // l'ordre d'affichage des blocs devenait imprévisible dans l'étude
    // dupliquée. On renumérote désormais explicitement à partir de 0 dans
    // l'ordre de la source (déjà triée par order ASC à l'include ci-dessus).
    // Même fix que celui appliqué pour les questions/items/sequenceSteps
    // (bug 9 de la première vague de l'issue #83).
    for (let bIdx = 0; bIdx < source.blocks.length; bIdx++) {
      const block = source.blocks[bIdx]
      const newBlock = await prisma.block.create({
        data: { type: block.type, label: block.label, order: bIdx, settings: block.settings, studyId: newStudy.id },
      })
      blockIdMap[block.id] = newBlock.id

      // Dupliquer les questions
      //
      // Bug 9 (issue #83) : auparavant, on recopiait simplement le champ
      // `order` de chaque item depuis la source. Si la source avait des
      // valeurs `order` cassées (doublons, trous, NULL), la duplication
      // héritait du problème — et l'ordre d'affichage devenait imprévisible
      // dans l'étude dupliquée. On renumérote désormais explicitement à
      // partir de 0 dans l'ordre de la source (déjà triée par order ASC).
      for (let qIdx = 0; qIdx < block.questions.length; qIdx++) {
        const q = block.questions[qIdx]
        const newQ = await prisma.question.create({
          data: { code: q.code, type: q.type, text: q.text, required: q.required, randomize: q.randomize, order: qIdx, settings: q.settings, blockId: newBlock.id },
        })
        if (q.choices.length > 0) {
          await prisma.choice.createMany({
            data: q.choices.map((c, i) => ({ code: c.code, label: c.label, order: i, anchored: c.anchored, mediaUrl: c.mediaUrl, mediaType: c.mediaType, questionId: newQ.id })),
          })
        }
        if (q.matrixItems.length > 0) {
          await prisma.matrixItem.createMany({
            data: q.matrixItems.map((m, i) => ({ code: m.code, label: m.label, order: i, reversed: m.reversed, left: m.left, right: m.right, questionId: newQ.id })),
          })
        }
      }

      // Dupliquer les fichiers stimulus (avec les données binaires)
      for (const sf of block.stimulusFiles) {
        await prisma.stimulusFile.create({
          data: { filename: sf.filename, originalName: sf.originalName, mimetype: sf.mimetype, size: sf.size, url: sf.url, data: sf.data, category: sf.category, blockId: newBlock.id },
        })
      }

      // Dupliquer les étapes de séquence (avec renumérotation explicite,
      // cf. note sur bug 9 ci-dessus pour la justification)
      if (block.sequenceSteps.length > 0) {
        await prisma.trialSequenceStep.createMany({
          data: block.sequenceSteps.map((s, i) => ({ type: s.type, order: i, settings: s.settings, blockId: newBlock.id })),
        })
      }
    }

    // Dupliquer le design expérimental
    if (source.design) {
      const newDesign = await prisma.experimentalDesign.create({
        data: {
          designType: source.design.designType,
          counterbalanceMethod: source.design.counterbalanceMethod,
          quotaMode: source.design.quotaMode,
          targetN: source.design.targetN,
          settings: source.design.settings,
          studyId: newStudy.id,
        },
      })
      for (const factor of source.design.factors) {
        const newFactor = await prisma.factor.create({
          data: { name: factor.name, type: factor.type, order: factor.order, designId: newDesign.id },
        })
        for (const level of factor.levels) {
          // Remapper les blockIds vers les nouveaux IDs
          const oldBlockIds = Array.isArray(level.blockIds) ? level.blockIds : []
          const newBlockIds = oldBlockIds.map(bid => blockIdMap[bid]).filter(Boolean)
          await prisma.factorLevel.create({
            data: { name: level.name, code: level.code, order: level.order, blockIds: newBlockIds, factorId: newFactor.id },
          })
        }
      }
    }

    // Version initiale
    await prisma.studyVersion.create({ data: { studyId: newStudy.id, version: 1, snapshot: { blocks: [] } } })

    await logActivity(prisma, userId, source.projectId, 'STUDY_DUPLICATED', `Étude "${source.name}" dupliquée → "${newStudy.name}"`)

    return reply.status(201).send({ study: newStudy })
  })

  // ── Ajouter une question ──────────────────────────────────────────────────
  fastify.post('/:id/blocks/:blockId/questions', async (req, reply) => {
    const { blockId } = req.params
    const { code, type, text, required, randomize, settings, choices, matrixItems } = req.body

    // Types sans code variable ni texte requis
    const NO_CODE_TYPES = ['DISPLAY', 'IMAGE', 'AUDIO', 'VIDEO', 'TIMING', 'META_INFO']
    const NO_TEXT_TYPES = ['IMAGE', 'AUDIO', 'VIDEO', 'TIMING', 'META_INFO']
    if (!type) return reply.status(400).send({ error: 'type requis.' })
    if (!NO_CODE_TYPES.includes(type) && !code) return reply.status(400).send({ error: 'code requis.' })
    if (!NO_TEXT_TYPES.includes(type) && !text) return reply.status(400).send({ error: 'text requis.' })

    const lastQ = await prisma.question.findFirst({
      where: { blockId },
      orderBy: { order: 'desc' },
    })
    const order = (lastQ?.order ?? -1) + 1

    const question = await prisma.question.create({
      data: {
        code: code || null,
        type,
        text: sanitize(text) || '',
        required: required ?? true,
        randomize: randomize ?? false,
        order,
        settings: settings || {},
        blockId,
        choices: choices ? {
          create: choices.map((c, i) => ({
            code: c.code, label: c.label, order: i,
            anchored: c.anchored || false,
            mediaUrl: c.mediaUrl || null,
            mediaType: c.mediaType || null,
          }))
        } : undefined,
        matrixItems: matrixItems ? {
          create: matrixItems.map((m, i) => ({
            code: m.code, label: m.label, order: i,
            reversed: m.reversed || false,
            left: m.left || null,
            right: m.right || null,
          }))
        } : undefined,
      },
      include: {
        choices:     { orderBy: { order: 'asc' } },
        matrixItems: { orderBy: { order: 'asc' } },
        conditions:  true,
      },
    })

    await saveVersion(prisma, req.params.id)
    return reply.status(201).send({ question })
  })

  // ── Réordonner les questions d'un bloc ───────────────────────────────────
  fastify.put('/:id/blocks/:blockId/reorder-questions', async (req, reply) => {
    const { order } = req.body
    if (!Array.isArray(order)) return reply.status(400).send({ error: 'order doit être un tableau.' })
    await Promise.all(
      order.map((questionId, index) =>
        prisma.question.update({ where: { id: questionId }, data: { order: index } })
      )
    )
    return reply.send({ ok: true })
  })

  // ── Modifier une question ─────────────────────────────────────────────────
  fastify.put('/:id/blocks/:blockId/questions/:questionId', async (req, reply) => {
    const { questionId } = req.params
    const { code, type, text, required, randomize, settings, choices, matrixItems } = req.body

    // Supprimer les anciens choix/items puis recréer
    await prisma.$transaction([
      prisma.choice.deleteMany({ where: { questionId } }),
      prisma.matrixItem.deleteMany({ where: { questionId } }),
    ])

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        code: code || null,
        type,
        text: sanitize(text) || '',
        required: required ?? true,
        randomize: randomize ?? false,
        settings: settings || {},
        choices: choices ? {
          create: choices.map((c, i) => ({
            code: c.code, label: c.label, order: i,
            anchored: c.anchored || false,
            mediaUrl: c.mediaUrl || null,
            mediaType: c.mediaType || null,
          }))
        } : undefined,
        matrixItems: matrixItems ? {
          create: matrixItems.map((m, i) => ({
            code: m.code, label: m.label, order: i,
            reversed: m.reversed || false,
            left: m.left || null,
            right: m.right || null,
          }))
        } : undefined,
      },
      include: {
        choices:     { orderBy: { order: 'asc' } },
        matrixItems: { orderBy: { order: 'asc' } },
        conditions:  true,
      },
    })

    await saveVersion(prisma, req.params.id)
    return reply.send({ question })
  })

  // ── Dupliquer une question ────────────────────────────────────────────────
  // Issue #83 point 6 : accepte un targetBlockId optionnel pour dupliquer
  // la question dans un AUTRE bloc QUESTION de la même étude (et non plus
  // uniquement dans le bloc d'origine). Si targetBlockId n'est pas fourni
  // ou égal au bloc source, comportement inchangé (copie dans le bloc
  // source). Le targetBlockId doit appartenir à la même étude (sinon 403).
  fastify.post('/:id/blocks/:blockId/questions/:questionId/duplicate', async (req, reply) => {
    const { id: studyId, blockId, questionId } = req.params
    const { targetBlockId } = req.body || {}

    const source = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        choices:     { orderBy: { order: 'asc' } },
        matrixItems: { orderBy: { order: 'asc' } },
      },
    })
    if (!source) return reply.status(404).send({ error: 'Question introuvable.' })

    // Détermine le bloc de destination (par défaut = bloc d'origine)
    let destinationBlockId = blockId
    if (targetBlockId && targetBlockId !== blockId) {
      // Vérifier que le bloc cible existe, est de type QUESTION et appartient
      // à la même étude — sinon refuser (sécurité multi-tenant)
      const targetBlock = await prisma.block.findUnique({
        where: { id: targetBlockId },
        select: { id: true, type: true, studyId: true },
      })
      if (!targetBlock || targetBlock.studyId !== studyId) {
        return reply.status(403).send({ error: 'Bloc cible introuvable ou non autorisé.' })
      }
      if (targetBlock.type !== 'QUESTION') {
        return reply.status(400).send({ error: 'La duplication n\'est possible que vers un bloc de type Questionnaire.' })
      }
      destinationBlockId = targetBlockId
    }

    // Prochain ordre dans le bloc de destination
    const lastQ = await prisma.question.findFirst({
      where: { blockId: destinationBlockId },
      orderBy: { order: 'desc' },
    })
    const nextOrder = (lastQ?.order ?? -1) + 1

    const duplicate = await prisma.question.create({
      data: {
        code: source.code ? `${source.code}_copy` : null,
        type: source.type,
        text: source.text,
        required: source.required,
        randomize: source.randomize,
        order: nextOrder,
        settings: source.settings || {},
        blockId: destinationBlockId,
        choices: source.choices.length ? {
          create: source.choices.map((c, i) => ({
            code: c.code, label: c.label, order: i,
            anchored: c.anchored || false,
            mediaUrl: c.mediaUrl || null,
            mediaType: c.mediaType || null,
          }))
        } : undefined,
        matrixItems: source.matrixItems.length ? {
          create: source.matrixItems.map((m, i) => ({
            code: m.code, label: m.label, order: i,
            reversed: m.reversed || false,
            left: m.left || null,
            right: m.right || null,
          }))
        } : undefined,
      },
      include: {
        choices:     { orderBy: { order: 'asc' } },
        matrixItems: { orderBy: { order: 'asc' } },
        conditions:  true,
      },
    })

    await saveVersion(prisma, req.params.id)
    return reply.status(201).send({ question: duplicate })
  })

  // ── Supprimer une question ────────────────────────────────────────────────
  fastify.delete('/:id/blocks/:blockId/questions/:questionId', async (req, reply) => {
    const { questionId } = req.params
    await prisma.question.delete({ where: { id: questionId } })
    await saveVersion(prisma, req.params.id)
    return reply.send({ message: 'Question supprimée.' })
  })
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

async function saveVersion(prisma, studyId) {
  try {
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { choices: true, matrixItems: true, conditions: true },
            },
          },
        },
      },
    })

    await prisma.study.update({
      where: { id: studyId },
      data: {
        version: { increment: 1 },
        versions: {
          create: { version: study.version + 1, snapshot: { blocks: study.blocks } },
        },
      },
    })
  } catch { /* ne pas bloquer */ }
}

async function logActivity(prisma, userId, projectId, action, details) {
  try {
    await prisma.activityLog.create({ data: { userId, projectId, action, details } })
  } catch { /* ne pas bloquer */ }
}

module.exports = studyRoutes
