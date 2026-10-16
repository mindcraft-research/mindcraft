// ─── CAHIER DE LABORATOIRE ───────────────────────────────────────────────────
// Entrées datées, signées, jamais modifiées ni supprimées : une erreur se
// rectifie par une CORRECTION qui cite l'entrée d'origine (correctsId).
//
// Deux sortes d'entrées :
//   - manuelles (PASSATION, ECART, DECISION, INCIDENT, NOTE), écrites par le
//     propriétaire du projet ou un collaborateur éditeur ;
//   - automatiques (kind AUTO), écrites par MindCraft : changement de statut,
//     modification de l'étude pendant la collecte, réinitialisation des
//     données, changement de l'objectif ou du délai d'abandon, gel du
//     matériel, verrouillage et amendements du préenregistrement.
// Une entrée automatique ne doit JAMAIS faire échouer l'action qui la
// déclenche : toutes les fonctions d'écriture automatique avalent leurs erreurs.

const TYPES_MANUELS = ['PASSATION', 'ECART', 'DECISION', 'INCIDENT', 'NOTE']
const EVENEMENTS_AUTO = ['STATUS', 'MODIFICATION', 'RESET', 'DESIGN', 'GEL', 'PREREG', 'AMENDEMENT']
const LONGUEUR_MAX = 5000
const MAX_PARTICIPANTS = 50
// Modifications pendant la collecte : une seule entrée par fenêtre de 30 min,
// sinon chaque enregistrement automatique du builder créerait une entrée.
const FENETRE_MODIFICATION_MS = 30 * 60 * 1000

const STATUTS_FR = {
  DRAFT: 'Brouillon', REVIEW: 'En révision', VALIDATED: 'Validée',
  COLLECTING: 'En collecte', COMPLETED: 'Terminée', ARCHIVED: 'Archivée',
}
const statutFr = (s) => STATUTS_FR[s] || s

// Identifiants de participants saisis librement (« P12, abc-3 ») → liste propre.
function normaliserParticipants(brut) {
  const liste = Array.isArray(brut) ? brut : String(brut || '').split(/[,;\s]+/)
  return [...new Set(liste.map((x) => String(x).trim()).filter(Boolean).map((x) => x.slice(0, 80)))]
    .slice(0, MAX_PARTICIPANTS)
}

// Validation d'une entrée manuelle. Renvoie { erreur } ou { entree }.
function validerEntreeManuelle({ kind, content, participantIds, correctsId }) {
  if (!TYPES_MANUELS.includes(kind)) return { erreur: "Type d'entrée inconnu." }
  const texte = typeof content === 'string' ? content.trim() : ''
  if (!texte) return { erreur: "Le texte de l'entrée est vide." }
  if (texte.length > LONGUEUR_MAX) return { erreur: `Texte trop long (${LONGUEUR_MAX} caractères au maximum).` }
  return {
    entree: {
      kind,
      content: texte,
      participantIds: normaliserParticipants(participantIds),
      correctsId: typeof correctsId === 'string' && correctsId ? correctsId : null,
    },
  }
}

async function nomUtilisateur(prisma, userId) {
  if (!userId) return null
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    return u?.username || null
  } catch { return null }
}

// refId : objet lié à l'entrée (ex. le gel du matériel, téléchargeable).
async function noterAuto(prisma, { studyId, userId = null, event, content, refId = null }) {
  if (!EVENEMENTS_AUTO.includes(event)) return null
  try {
    return await prisma.notebookEntry.create({
      data: {
        studyId, kind: 'AUTO', autoEvent: event, content, refId,
        authorId: userId, authorName: await nomUtilisateur(prisma, userId),
      },
    })
  } catch { return null }
}

const noterStatut = (prisma, { studyId, userId, avant, apres }) => (avant === apres ? null : noterAuto(prisma, {
  studyId, userId, event: 'STATUS', content: `Statut : ${statutFr(avant)} → ${statutFr(apres)}.`,
}))

const noterReinitialisation = (prisma, { studyId, userId, nbSessions, statut }) => noterAuto(prisma, {
  studyId, userId, event: 'RESET',
  content: `Données réinitialisées : ${nbSessions} session${nbSessions > 1 ? 's' : ''} supprimée${nbSessions > 1 ? 's' : ''} (statut de l'étude : ${statutFr(statut)}).`,
})

// Changements de l'objectif ou du délai d'abandon (onglet Design).
function changementsDesign(avant, apres) {
  const lignes = []
  const nAvant = avant?.targetN ?? null, nApres = apres?.targetN ?? null
  if (nAvant !== nApres) lignes.push(`objectif ${nAvant ?? '—'} → ${nApres ?? '—'} participants`)
  const hAvant = avant?.settings?.abandonAfterHours ?? null, hApres = apres?.settings?.abandonAfterHours ?? null
  if (hAvant !== hApres) lignes.push(`délai d'abandon ${hAvant ? `${hAvant} h` : 'aucun'} → ${hApres ? `${hApres} h` : 'aucun'}`)
  return lignes
}

const noterDesign = (prisma, { studyId, userId, avant, apres }) => {
  const lignes = changementsDesign(avant, apres)
  if (!lignes.length) return null
  return noterAuto(prisma, { studyId, userId, event: 'DESIGN', content: `Design modifié : ${lignes.join(' ; ')}.` })
}

// Modification de la structure pendant la collecte (appelée après chaque
// sauvegarde de version). Une entrée au plus par fenêtre de 30 minutes.
async function noterModificationPendantCollecte(prisma, { studyId, userId, statut, version, maintenant = Date.now() }) {
  if (statut !== 'COLLECTING') return null
  try {
    const recente = await prisma.notebookEntry.findFirst({
      where: { studyId, kind: 'AUTO', autoEvent: 'MODIFICATION', createdAt: { gte: new Date(maintenant - FENETRE_MODIFICATION_MS) } },
      select: { id: true },
    })
    if (recente) return null
    return await noterAuto(prisma, {
      studyId, userId, event: 'MODIFICATION',
      content: `Étude modifiée pendant la collecte (version ${version}). Les participants déjà passés ont vu la version précédente ; le détail de chaque version reste enregistré.`,
    })
  } catch { return null }
}

module.exports = {
  TYPES_MANUELS, EVENEMENTS_AUTO, LONGUEUR_MAX, FENETRE_MODIFICATION_MS, STATUTS_FR,
  statutFr, normaliserParticipants, validerEntreeManuelle, changementsDesign,
  noterAuto, noterStatut, noterReinitialisation, noterDesign, noterModificationPendantCollecte, nomUtilisateur,
}
