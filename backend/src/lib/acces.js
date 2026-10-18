// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── CONTRÔLE D'ACCÈS AUX ÉTUDES ─────────────────────────────────────────────
// Règle unique pour toutes les routes d'une étude (studies, design, stimulus) :
//   - lire : propriétaire du projet ou collaborateur (ÉDITEUR ou LECTEUR) ;
//   - modifier : propriétaire ou collaborateur ÉDITEUR ;
//   - un bloc, une question, un facteur, un niveau ou un fichier n'est
//     accessible que par l'étude à laquelle il appartient.
// Une étude inaccessible répond 404 (on ne révèle pas qu'elle existe) ; un
// LECTEUR qui tente de modifier reçoit 403.

const ROLES_ECRITURE = ['OWNER', 'EDITOR']
const METHODES_LECTURE = ['GET', 'HEAD', 'OPTIONS']

// { study, role } si l'utilisateur fait partie du projet de l'étude, sinon null.
async function roleDansEtude(prisma, studyId, userId) {
  if (!studyId || !userId) return null
  const study = await prisma.study.findFirst({
    where: { id: String(studyId), project: { is: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } },
    select: { id: true, projectId: true, project: { select: { ownerId: true, collaborators: { where: { userId }, select: { role: true } } } } },
  })
  if (!study) return null
  const role = study.project.ownerId === userId ? 'OWNER' : study.project.collaborators[0]?.role || null
  return role ? { study, role } : null
}

// Rôle dans un projet (création d'étude) : 'OWNER', 'EDITOR', 'VIEWER' ou null.
async function roleDansProjet(prisma, projectId, userId) {
  if (!projectId || !userId) return null
  const projet = await prisma.project.findUnique({
    where: { id: String(projectId) },
    select: { ownerId: true, collaborators: { where: { userId }, select: { role: true } } },
  })
  if (!projet) return null
  return projet.ownerId === userId ? 'OWNER' : projet.collaborators[0]?.role || null
}

// Vérifie l'accès et répond 404 / 403 si besoin. Renvoie { study, role } ou
// null (la réponse est alors déjà envoyée).
async function exigerAcces(prisma, req, reply, studyId, { ecriture = !METHODES_LECTURE.includes(req.method) } = {}) {
  const acces = await roleDansEtude(prisma, studyId, req.user?.id)
  if (!acces) { reply.status(404).send({ error: 'Étude introuvable.' }); return null }
  if (ecriture && !ROLES_ECRITURE.includes(acces.role)) {
    reply.status(403).send({ error: 'Vous consultez cette étude en lecture seule : seuls le propriétaire et les éditeurs du projet peuvent la modifier.' })
    return null
  }
  return acces
}

// Le bloc / la question / le facteur / le niveau des paramètres de la route
// appartiennent-ils bien à l'étude ? (Sinon 404, sans rien révéler.)
async function verifierAppartenance(prisma, reply, { studyId, blockId, questionId, factorId, levelId }) {
  const introuvable = () => { reply.status(404).send({ error: 'Élément introuvable dans cette étude.' }); return false }
  if (blockId && !(await prisma.block.findFirst({ where: { id: String(blockId), studyId }, select: { id: true } }))) return introuvable()
  if (questionId && !(await prisma.question.findFirst({ where: { id: String(questionId), ...(blockId ? { blockId: String(blockId) } : {}), block: { studyId } }, select: { id: true } }))) return introuvable()
  if (factorId && !(await prisma.factor.findFirst({ where: { id: String(factorId), design: { studyId } }, select: { id: true } }))) return introuvable()
  if (levelId && !(await prisma.factorLevel.findFirst({ where: { id: String(levelId), ...(factorId ? { factorId: String(factorId) } : {}), factor: { design: { studyId } } }, select: { id: true } }))) return introuvable()
  return true
}

module.exports = { ROLES_ECRITURE, roleDansEtude, roleDansProjet, exigerAcces, verifierAppartenance }
