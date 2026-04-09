/**
 * Creates a demo study for a new user from the template.
 * Called during user registration.
 */
const template = require('./demoStudyTemplate.json')

async function createDemoStudy(prisma, userId) {
  // 1. Create project
  const project = await prisma.project.create({
    data: {
      name: 'Démo MindCraft',
      description: 'Projet de démonstration — explorez toutes les fonctionnalités de la plateforme. Vous pouvez le supprimer à tout moment.',
      ownerId: userId,
    },
  })

  // 2. Create study
  const study = await prisma.study.create({
    data: {
      name: template.name,
      description: template.description,
      metadata: template.metadata || {},
      projectId: project.id,
    },
  })

  // 3. Create blocks with all nested data
  for (const blockTpl of template.blocks) {
    const block = await prisma.block.create({
      data: {
        type: blockTpl.type,
        order: blockTpl.order,
        label: blockTpl.label || null,
        settings: blockTpl.settings || {},
        studyId: study.id,
      },
    })

    // Questions
    for (const qTpl of (blockTpl.questions || [])) {
      await prisma.question.create({
        data: {
          code: qTpl.code || null,
          type: qTpl.type,
          text: qTpl.text || '',
          required: qTpl.required ?? true,
          randomize: qTpl.randomize ?? false,
          order: qTpl.order,
          settings: qTpl.settings || {},
          blockId: block.id,
          choices: (qTpl.choices?.length > 0) ? {
            create: qTpl.choices.map((c) => ({
              code: c.code,
              label: c.label,
              order: c.order,
              anchored: c.anchored || false,
              mediaUrl: c.mediaUrl || null,
              mediaType: c.mediaType || null,
            })),
          } : undefined,
          matrixItems: (qTpl.matrixItems?.length > 0) ? {
            create: qTpl.matrixItems.map((m) => ({
              code: m.code,
              label: m.label,
              order: m.order,
              reversed: m.reversed || false,
              left: m.left || null,
              right: m.right || null,
            })),
          } : undefined,
        },
      })
    }

    // Sequence steps
    for (const stepTpl of (blockTpl.sequenceSteps || [])) {
      await prisma.trialSequenceStep.create({
        data: {
          type: stepTpl.type,
          order: stepTpl.order,
          settings: stepTpl.settings || {},
          blockId: block.id,
        },
      })
    }

    // Stimulus files (text-based only — skip actual file uploads)
    for (const fileTpl of (blockTpl.stimulusFiles || [])) {
      await prisma.stimulusFile.create({
        data: {
          filename: fileTpl.filename,
          originalName: fileTpl.originalName,
          mimetype: fileTpl.mimetype,
          size: fileTpl.size || 0,
          url: fileTpl.url || '',
          category: fileTpl.category || null,
          blockId: block.id,
        },
      })
    }
  }

  // 4. Create experimental design
  if (template.design) {
    const design = await prisma.experimentalDesign.create({
      data: {
        designType: template.design.designType,
        counterbalanceMethod: template.design.counterbalanceMethod,
        quotaMode: template.design.quotaMode,
        targetN: template.design.targetN,
        settings: template.design.settings || {},
        studyId: study.id,
      },
    })

    for (const factorTpl of (template.design.factors || [])) {
      await prisma.factor.create({
        data: {
          name: factorTpl.name,
          type: factorTpl.type,
          order: factorTpl.order,
          designId: design.id,
          levels: (factorTpl.levels?.length > 0) ? {
            create: factorTpl.levels.map((l) => ({
              name: l.name,
              code: l.code,
              order: l.order,
            })),
          } : undefined,
        },
      })
    }
  }

  // 5. Create initial version snapshot
  await prisma.studyVersion.create({
    data: {
      studyId: study.id,
      versionNumber: 1,
      snapshot: {},
    },
  })

  return { project, study }
}

module.exports = { createDemoStudy }
