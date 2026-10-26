// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── TÂCHE EXTERNE : ENREGISTREMENT EN COURS DE TÂCHE ────────────────────────
//
// Avant, les résultats d'une tâche externe (iFrame) n'étaient enregistrés qu'à
// la fin (message `mindcraft:complete`) : une tâche interrompue ne laissait
// rien. Le runner envoie désormais, au fil de la tâche :
//   - les marqueurs reçus de la tâche (`mindcraft:marker`, avec leurs données
//     d'essai), horodatés — sans rien changer à la tâche ;
//   - les résultats partiels si la tâche les publie (`mindcraft:partial`,
//     tableau cumulatif, même format que celui de `mindcraft:complete`).
// Ils vont dans UNE ligne ExternalTaskResponse par participant et par bloc,
// marquée `partial` tant que la tâche n'est pas terminée. À la fin, la même
// ligne reçoit les résultats complets et perd sa marque `partial`.
//
// Envois idempotents : chaque montage de la tâche a son identifiant (`attempt`)
// et chaque envoi donne la position (`from`) de ses marqueurs dans la série de
// cette tentative ; un renvoi ou deux envois qui se chevauchent ne dupliquent
// donc rien, et un rechargement de page ajoute une nouvelle tentative sans
// effacer la précédente.

const MAX_MARQUEURS = 20000   // par ligne : garde-fou contre un envoi en boucle
const MAX_PAR_ENVOI = 5000

// Nouvelle liste de marqueurs après un envoi.
//   existants : marqueurs déjà enregistrés ([{ a, i, t, at, marker, data }])
//   attempt   : identifiant de la tentative de l'envoi
//   from      : position, dans cette tentative, du 1er marqueur envoyé
//   nouveaux  : marqueurs envoyés ({ t, at, marker, data })
function fusionnerMarqueurs(existants, { attempt, from, nouveaux }) {
  const avant = Array.isArray(existants) ? existants : []
  const autres = avant.filter((m) => m && m.a !== attempt)
  const deCetteTentative = avant.filter((m) => m && m.a === attempt)
  const debut = Math.max(0, Math.min(Number.isInteger(from) ? from : deCetteTentative.length, deCetteTentative.length))
  const gardes = deCetteTentative.slice(0, debut)
  const ajoutes = (Array.isArray(nouveaux) ? nouveaux : []).slice(0, MAX_PAR_ENVOI).map((m, k) => ({
    a: attempt,
    i: debut + k,
    t: Number.isFinite(Number(m?.t)) ? Math.round(Number(m.t)) : null,
    at: typeof m?.at === 'string' ? m.at.slice(0, 40) : null,
    marker: String(m?.marker ?? '').slice(0, 200),
    data: m?.data && typeof m.data === 'object' && !Array.isArray(m.data) ? m.data : null,
  }))
  return [...autres, ...gardes, ...ajoutes].slice(0, MAX_MARQUEURS)
}

// Envoi en cours de tâche. Corps : { participantId, blockId, attempt, from,
// markers?, results?, complete? }. `complete` (fin de tâche sans résultats,
// p. ex. bouton « Terminé ») retire la marque `partial` sans toucher aux données.
async function enregistrerPartiel(prisma, studyId, body) {
  const { participantId, blockId, attempt, from, markers, results, complete } = body || {}
  const ligne = await prisma.externalTaskResponse.findFirst({
    where: { studyId, participantId, blockId },
    orderBy: { createdAt: 'desc' },
  })
  const data = {}
  if (Array.isArray(markers) && markers.length) {
    data.markers = fusionnerMarqueurs(ligne?.markers, { attempt: String(attempt || ''), from, nouveaux: markers })
  }
  // Les résultats partiels ne remplacent jamais des résultats définitifs.
  if (results !== undefined && (!ligne || ligne.partial)) data.data = Array.isArray(results) ? results : [results]
  if (complete && ligne?.partial) data.partial = false
  if (Object.keys(data).length === 0) return { id: ligne?.id || null, changed: false }

  if (!ligne) {
    const cree = await prisma.externalTaskResponse.create({
      data: { participantId, studyId, blockId, data: data.data ?? [], markers: data.markers ?? null, partial: !complete, updatedAt: new Date() },
    })
    return { id: cree.id, changed: true }
  }
  await prisma.externalTaskResponse.update({ where: { id: ligne.id }, data: { ...data, updatedAt: new Date() } })
  return { id: ligne.id, changed: true }
}

// Résultats de fin de tâche (`mindcraft:complete`). Si une ligne partielle
// existe pour ce participant et ce bloc, elle devient la ligne définitive (ses
// marqueurs sont gardés) ; sinon, création comme avant.
async function enregistrerFinal(prisma, studyId, { participantId, blockId, data }) {
  const partielle = await prisma.externalTaskResponse.findFirst({
    where: { studyId, participantId, blockId, partial: true },
    orderBy: { createdAt: 'desc' },
  })
  if (partielle) {
    const maj = await prisma.externalTaskResponse.update({
      where: { id: partielle.id },
      data: { data, partial: false, updatedAt: new Date() },
    })
    return maj
  }
  return prisma.externalTaskResponse.create({ data: { participantId, studyId, blockId, data } })
}

module.exports = { fusionnerMarqueurs, enregistrerPartiel, enregistrerFinal, MAX_MARQUEURS }
