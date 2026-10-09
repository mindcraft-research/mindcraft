// ─── PASSATIONS ABANDONNÉES ──────────────────────────────────────────────────
//
// Le chercheur peut fixer, dans l'onglet Design, un délai au-delà duquel une
// passation non terminée est considérée comme abandonnée
// (`design.settings.abandonAfterHours`). Sans délai : rien ne change.
//
// Une session ALLOCATED / IN_PROGRESS passe en ABANDONED quand sa DERNIÈRE
// ACTIVITÉ (arrivée sur une page, réponse, essai, résultat de tâche externe,
// ou à défaut début de la passation) remonte à plus que ce délai. Partir de la
// dernière activité, et non du début, évite de pénaliser un participant lent.
//
// Effets : la session ne compte plus dans les quotas (place libérée pour un
// nouveau participant) et l'export « uniquement les participants ayant
// terminé » l'exclut. Rien n'est supprimé. Une personne qui revient et termine
// repasse en COMPLETED.
//
// Calcul « paresseux », sans tâche planifiée : au moment où l'on en a besoin
// (allocation d'un participant, suivi du recrutement, export), au plus une
// fois par minute et par étude (sauf `force`).

const EN_COURS = ['ALLOCATED', 'IN_PROGRESS']
const INTERVALLE_MS = 60 * 1000
const dernierPassage = new Map()

function delaiAbandonHeures(design) {
  const h = Number(design?.settings?.abandonAfterHours)
  return Number.isFinite(h) && h > 0 ? h : null
}

// Sessions à basculer, à partir des dates de dernière activité par participant.
//   candidates : [{ id, participantId, allocatedAt, startedAt }]
//   activites  : { participantId: Date } (dernière activité connue)
function sessionsAbandonnees(candidates, activites, limite) {
  return candidates
    .filter((c) => {
      const dates = [c.allocatedAt, c.startedAt, activites[c.participantId]].filter(Boolean).map((d) => new Date(d))
      const derniere = new Date(Math.max(...dates.map((d) => d.getTime())))
      return derniere < limite
    })
    .map((c) => c.id)
}

async function marquerAbandons(prisma, studyId, design, { force = false, maintenant = Date.now() } = {}) {
  const heures = delaiAbandonHeures(design)
  if (!heures) return 0
  if (!force && maintenant - (dernierPassage.get(studyId) || 0) < INTERVALLE_MS) return 0
  dernierPassage.set(studyId, maintenant)

  const limite = new Date(maintenant - heures * 3600 * 1000)
  // Une session ouverte après la limite ne peut pas être abandonnée.
  const candidates = await prisma.participantSession.findMany({
    where: { studyId, status: { in: EN_COURS }, allocatedAt: { lt: limite } },
    select: { id: true, participantId: true, allocatedAt: true, startedAt: true },
  })
  if (candidates.length === 0) return 0

  const where = { studyId, participantId: { in: candidates.map((c) => c.participantId) } }
  const [visites, reponses, essais, externes] = await Promise.all([
    prisma.pageVisit.groupBy({ by: ['participantId'], where, _max: { visitedAt: true } }),
    prisma.questionResponse.groupBy({ by: ['participantId'], where, _max: { createdAt: true } }),
    prisma.trialResponse.groupBy({ by: ['participantId'], where, _max: { createdAt: true } }),
    prisma.externalTaskResponse.groupBy({ by: ['participantId'], where, _max: { createdAt: true } }),
  ])
  const activites = {}
  const noter = (pid, d) => { if (d && (!activites[pid] || d > activites[pid])) activites[pid] = d }
  for (const v of visites) noter(v.participantId, v._max.visitedAt)
  for (const r of [...reponses, ...essais, ...externes]) noter(r.participantId, r._max.createdAt)

  const ids = sessionsAbandonnees(candidates, activites, limite)
  if (ids.length === 0) return 0
  // Ne bascule que les sessions encore en cours (l'une a pu se terminer entre-temps).
  const { count } = await prisma.participantSession.updateMany({
    where: { id: { in: ids }, status: { in: EN_COURS } },
    data: { status: 'ABANDONED' },
  })
  return count
}

module.exports = { delaiAbandonHeures, sessionsAbandonnees, marquerAbandons }
