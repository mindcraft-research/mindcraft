/**
 * Données de participants orphelines : réponses, essais, résultats de tâches
 * et temps par page qui n'appartiennent plus à aucune session (étude, projet
 * ou compte supprimé, données réinitialisées, ou anciennes prévisualisations).
 * Avant la correction de lib/donneesParticipants.js, ces suppressions
 * laissaient ces lignes en base. Elles n'apparaissent dans aucun export.
 *
 * Par défaut, le script COMPTE seulement. Pour supprimer :
 *   node scripts/nettoyer-donnees-orphelines.js --appliquer
 * (DATABASE_URL de la base visée dans l'environnement ou backend/.env)
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TABLES = ['question_responses', 'trial_responses', 'external_task_responses', 'page_visits']
const SANS_SESSION = (t) => `FROM ${t} r WHERE NOT EXISTS (SELECT 1 FROM participant_sessions s WHERE s."studyId" = r."studyId" AND s."participantId" = r."participantId")`

;(async () => {
  const appliquer = process.argv.includes('--appliquer')
  let total = 0
  for (const t of TABLES) {
    const [{ n }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n ${SANS_SESSION(t)}`)
    total += n
    console.log(`${t} : ${n} ligne${n > 1 ? 's' : ''} orpheline${n > 1 ? 's' : ''}`)
  }
  if (!appliquer) {
    console.log(`\nTotal : ${total}. Rien n'a été supprimé (ajoutez --appliquer pour supprimer).`)
  } else if (total) {
    await prisma.$transaction(TABLES.map((t) => prisma.$executeRawUnsafe(`DELETE ${SANS_SESSION(t)}`)))
    console.log(`\n${total} ligne${total > 1 ? 's' : ''} supprimée${total > 1 ? 's' : ''}.`)
  } else {
    console.log('\nRien à supprimer.')
  }
  await prisma.$disconnect()
})().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1) })
