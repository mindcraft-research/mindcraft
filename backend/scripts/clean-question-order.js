#!/usr/bin/env node
/**
 * Nettoyage ponctuel : retire de settings._questionOrder les IDs qui ne
 * correspondent à aucune question du bloc (ex. études de démo créées avec un
 * modèle qui contenait les IDs de l'étude source, questions supprimées après
 * un glisser-déposer). Si plus aucun ID ne correspond, la clé est supprimée.
 *
 * Sans effet sur l'affichage : le tri (QuestionBlock, BlockInspector,
 * BlockCanvas, export) ignore déjà les IDs inconnus et place les questions
 * absentes de la liste à la fin, dans l'ordre de `order`.
 *
 * Par prudence, les études déjà lancées ou engagées ne sont pas modifiées
 * (les réglages des blocs entrent dans l'empreinte du gel, lib/freeze.js) :
 * étude avec un gel, au moins une session, ou un préenregistrement.
 *
 * Usage :
 *   node scripts/clean-question-order.js           # simulation (rien n'est écrit)
 *   node scripts/clean-question-order.js --apply   # écrit les changements
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  const blocks = await prisma.block.findMany({
    where: { type: 'QUESTION' },
    select: {
      id: true,
      settings: true,
      questions: { select: { id: true } },
      study: {
        select: {
          id: true,
          name: true,
          project: { select: { name: true } },
          preregistration: { select: { id: true } },
          _count: { select: { freezes: true, participantSessions: true } },
        },
      },
    },
  })

  let modifies = 0, idsRetires = 0, ignores = 0
  for (const b of blocks) {
    const ordre = b.settings?._questionOrder
    if (!Array.isArray(ordre)) continue
    const ids = new Set(b.questions.map((q) => q.id))
    const garde = ordre.filter((id) => ids.has(id))
    if (garde.length === ordre.length) continue

    const s = b.study
    const lieu = `${s.project.name} / ${s.name} (bloc ${b.id})`
    if (s._count.freezes > 0 || s._count.participantSessions > 0 || s.preregistration) {
      console.log(`  IGNORÉ ${lieu} — étude lancée ou préenregistrée (${ordre.length - garde.length} IDs inconnus)`)
      ignores++
      continue
    }

    const { _questionOrder, ...reste } = b.settings
    const settings = garde.length > 0 ? { ...reste, _questionOrder: garde } : reste
    console.log(`  ${APPLY ? 'OK  ' : 'SIM '} ${lieu} — ${ordre.length - garde.length} IDs retirés${garde.length ? '' : ' (clé supprimée)'}`)
    if (APPLY) await prisma.block.update({ where: { id: b.id }, data: { settings } })
    modifies++
    idsRetires += ordre.length - garde.length
  }

  console.log(`\n${APPLY ? 'Appliqué' : 'Simulation'} : ${modifies} blocs, ${idsRetires} IDs retirés, ${ignores} blocs ignorés.`)
  if (!APPLY && modifies > 0) console.log('Relancer avec --apply pour écrire les changements.')
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
