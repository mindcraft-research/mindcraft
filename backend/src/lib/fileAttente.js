// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── FILE D'ATTENTE PAR CLÉ ──────────────────────────────────────────────────
// Exécute les tâches d'une même clé (ex. une étude) l'une après l'autre, dans
// l'ordre d'arrivée ; des clés différentes avancent en parallèle.
//
// Sert à l'attribution des conditions : quand des dizaines de participants
// ouvrent le lien dans la même seconde (amphi), ils attendent leur tour une
// fraction de seconde au lieu de se gêner dans la base. Les tâches en attente
// n'occupent aucune connexion à la base.
//
// Une tâche en échec ne bloque pas les suivantes.

const files = new Map()

function enFile(cle, tache) {
  const precedente = files.get(cle) || Promise.resolve()
  const resultat = precedente.then(() => tache())
  const fin = resultat.then(() => {}, () => {})
  files.set(cle, fin)
  // Libère la clé quand la file est vide (pas de fuite mémoire).
  fin.then(() => { if (files.get(cle) === fin) files.delete(cle) })
  return resultat
}

// Pour les tests.
const tailleFiles = () => files.size

module.exports = { enFile, tailleFiles }
