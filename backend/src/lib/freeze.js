// ─── GEL DU MATÉRIEL ─────────────────────────────────────────────────────────
// Au lancement de la VRAIE collecte — arrivée du premier participant, c'est-
// à-dire la première session de l'étude, ou la première après une
// réinitialisation des données (qui efface les sessions de test) — MindCraft
// conserve une copie complète de l'étude (StudyFreeze) avec son empreinte, et
// l'inscrit dans le cahier de laboratoire. Le codebook de cette copie reste
// téléchargeable à tout moment : il montre le matériel tel que les
// participants l'ont vu au lancement, même si l'étude a été modifiée depuis.
//
// Un passage « En collecte » pour tester ne pose pas de problème : tant que
// les données de test sont réinitialisées avant la vraie collecte, le gel de
// référence est celui du premier vrai participant.

const crypto = require('node:crypto')
const { noterAuto } = require('./notebook')

// Même contenu que le chargement de l'étude pour l'export (codebook).
const INCLUDE_ETUDE_COMPLETE = {
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
      factors: { include: { levels: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
    },
  },
}

// Champs techniques sans rapport avec le matériel vu par les participants :
// identifiants de liaison et horodatages. Ils changent sans que le matériel
// change (ex. une copie d'étude), ils sont donc exclus de l'empreinte.
const CLES_IGNOREES = new Set(['id', 'createdAt', 'updatedAt', 'studyId', 'blockId', 'questionId', 'designId', 'factorId', 'projectId'])

// Sérialisation stable (clés triées) de la partie « matériel » de l'étude.
function canonique(valeur) {
  if (Array.isArray(valeur)) return `[${valeur.map(canonique).join(',')}]`
  if (valeur && typeof valeur === 'object' && !(valeur instanceof Date)) {
    return `{${Object.keys(valeur).filter((k) => !CLES_IGNOREES.has(k) && valeur[k] !== undefined).sort()
      .map((k) => `${JSON.stringify(k)}:${canonique(valeur[k])}`).join(',')}}`
  }
  return JSON.stringify(valeur instanceof Date ? valeur.toISOString() : valeur ?? null)
}

// Matériel = blocs (avec questions, choix, items, fichiers de tâche, étapes)
// + structure du design (facteurs et niveaux). L'objectif de participants,
// les quotas, le délai d'abandon, le statut ou le nom de l'étude n'en font
// pas partie : les modifier ne change pas ce que voient les participants.
function materiel(study) {
  const d = study.design
  return {
    blocks: study.blocks || [],
    design: d ? { designType: d.designType, counterbalanceMethod: d.counterbalanceMethod, factors: d.factors || [] } : null,
  }
}

function empreinteEtude(study) {
  return crypto.createHash('sha256').update(canonique(materiel(study))).digest('hex')
}

// Affichage court et lisible : « 7b2d 41c9 e91f a0d3 ».
const empreinteCourte = (hex) => String(hex || '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ')

// Faut-il geler ? Oui s'il existe des sessions et aucun gel depuis la plus
// ancienne d'entre elles.
async function aFiger(db, studyId) {
  const premiere = await db.participantSession.findFirst({
    where: { studyId }, orderBy: { allocatedAt: 'asc' }, select: { allocatedAt: true },
  })
  if (!premiere) return false
  const dejaFige = await db.studyFreeze.findFirst({
    where: { studyId, createdAt: { gte: premiere.allocatedAt } }, select: { id: true },
  })
  return !dejaFige
}

// Appelé après la création d'une session. Gèle si c'est le premier
// participant de la collecte en cours. Ne fait jamais échouer l'arrivée du
// participant.
//
// Arrivées simultanées (amphi) : un verrou par étude, pris dans la base,
// garantit un seul gel. Le verrou n'est demandé que tant que l'étude n'est
// pas figée ; ensuite, la vérification rapide suffit.
async function figerSiPremierParticipant(prisma, studyId) {
  try {
    if (!(await aFiger(prisma, studyId))) return null
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'gel:' + studyId}))`
      if (!(await aFiger(tx, studyId))) return null

      const study = await tx.study.findUnique({ where: { id: studyId }, include: INCLUDE_ETUDE_COMPLETE })
      if (!study) return null
      // Étude déjà en collecte quand le gel a été mis en place : des
      // participants ont commencé avant. Le gel est pris en cours de
      // collecte, et le dit.
      const priorSessions = Math.max(0, (await tx.participantSession.count({ where: { studyId } })) - 1)
      const fingerprint = empreinteEtude(study)
      const gel = await tx.studyFreeze.create({
        data: { studyId, version: study.version, fingerprint, priorSessions, snapshot: JSON.parse(JSON.stringify(study)) },
      })
      const fige = `(version ${study.version}, empreinte ${empreinteCourte(fingerprint)}). Le codebook de cette version reste téléchargeable, même si l'étude est modifiée ensuite.`
      await noterAuto(tx, {
        studyId, event: 'GEL', refId: gel.id,
        content: priorSessions === 0
          ? `Collecte lancée : version de l'étude enregistrée au premier participant ${fige}`
          : `Version de l'étude enregistrée en cours de collecte, après ${priorSessions} participant${priorSessions > 1 ? 's' : ''} (antérieurs à cette fonctionnalité) ${fige}`,
      })
      return gel
    }, { timeout: 20000 })
  } catch {
    return null
  }
}

module.exports = { INCLUDE_ETUDE_COMPLETE, canonique, materiel, empreinteEtude, empreinteCourte, figerSiPremierParticipant }
