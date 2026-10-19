// SPDX-License-Identifier: AGPL-3.0-or-later
// Versions publiées de MindCraft, pour citer dans le codebook la version
// utilisée pendant la collecte d'une étude. Copie de la table de
// frontend/src/lib/citation.js (source de vérité) : à mettre à jour ensemble
// à chaque release (nouvelle entrée EN TÊTE, DOI ajouté quand Zenodo l'a
// attribué).

const VERSIONS = [
  { version: '0.2.0', inUseFrom: '2026-10-20', doi: null },
  { version: '0.1.0', inUseFrom: '2026-04-28', doi: '10.5281/zenodo.19864887' },
]

const jour = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null)

// Versions utilisées entre `debut` et `fin` (aujourd'hui par défaut), de la
// plus ancienne à la plus récente ; sans début, la version actuelle.
function versionsPourPeriode(debut, fin, aujourdhui = new Date()) {
  if (!debut) return [VERSIONS[0]]
  const d = jour(debut)
  const f = jour(fin) || jour(aujourdhui)
  return VERSIONS.filter((v, i) => {
    const finVersion = i === 0 ? '9999-12-31' : VERSIONS[i - 1].inUseFrom
    return v.inUseFrom <= f && finVersion > d
  }).reverse()
}

const DATE_FR = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

// « MindCraft 0.1.0 (doi:…) puis 0.2.0 (à partir du 20 octobre 2026, DOI à venir) ».
function texteVersions(versions) {
  return versions.map((v, i) => {
    const doi = v.doi ? `doi:${v.doi}` : 'DOI à venir'
    const depuis = versions.length > 1 && i > 0 ? `à partir du ${DATE_FR(v.inUseFrom)}, ` : ''
    return `${i === 0 ? 'MindCraft ' : ''}${v.version} (${depuis}${doi})`
  }).join(' puis ')
}

module.exports = { VERSIONS, versionsPourPeriode, texteVersions }
