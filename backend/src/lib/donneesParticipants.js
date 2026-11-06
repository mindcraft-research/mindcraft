// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── SUPPRESSION DES DONNÉES DES PARTICIPANTS ────────────────────────────────
// Les réponses, essais, résultats de tâches, temps par page et masquages
// (anonymisation des réponses libres) sont rangés par
// identifiant d'étude et de participant, SANS lien de base vers l'étude ni la
// session : supprimer une session, une étude, un projet ou un compte ne les
// efface pas d'eux-mêmes. Toute suppression passe donc par ici.
//
// Les codes aléatoires et les conditions attribuées sont liés à la session :
// ils partent avec elle.

const TABLES = ['questionResponse', 'trialResponse', 'externalTaskResponse', 'pageVisit', 'masquage']

// Supprime les données des participants des études `studyIds` — d'un seul
// participant si `participantId` est donné. À appeler dans une transaction si
// la suppression de l'étude (ou du projet, du compte) suit.
// Renvoie { sessions, lignes } : sessions et lignes de données supprimées.
async function supprimerDonneesParticipants(db, { studyIds, participantId = null }) {
  const ids = (studyIds || []).map(String)
  if (!ids.length) return { sessions: 0, lignes: 0 }
  const where = { studyId: { in: ids }, ...(participantId != null ? { participantId: String(participantId) } : {}) }
  let lignes = 0
  for (const table of TABLES) lignes += (await db[table].deleteMany({ where })).count
  const sessions = (await db.participantSession.deleteMany({ where })).count
  return { sessions, lignes }
}

// Études d'un projet, ou des projets dont un compte est propriétaire (supprimés
// avec lui).
const etudesDuProjet = async (db, projectId) =>
  (await db.study.findMany({ where: { projectId: String(projectId) }, select: { id: true } })).map((s) => s.id)
const etudesDuCompte = async (db, userId) =>
  (await db.study.findMany({ where: { project: { ownerId: String(userId) } }, select: { id: true } })).map((s) => s.id)

module.exports = { supprimerDonneesParticipants, etudesDuProjet, etudesDuCompte }
