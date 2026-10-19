// SPDX-License-Identifier: AGPL-3.0-or-later
// Source unique de vérité pour la citation de MindCraft (frontend ; le
// backend en garde une copie pour le codebook : backend/src/lib/versions.js).
//
// Chaque version publiée a sa propre référence (DOI Zenodo, SWHID) et reste
// citable : une étude se cite avec la version utilisée pendant sa collecte.
// `inUseFrom` est la date à partir de laquelle la version est utilisée par
// la plateforme (une étude collectée avant le 20 octobre 2026 cite la
// v0.1.0, à partir de cette date la v0.2.0).
//
// À chaque release : ajouter une entrée EN TÊTE de VERSIONS (sans DOI le
// temps que Zenodo l'attribue, puis compléter `doi`, `swhid`…).

const COMMUN = {
  title: 'MindCraft',
  subtitle: 'Open-source platform for online behavioural experiments',
  authorFamily: 'David',
  authorGiven: 'Dayle',
  authorOrcid: '0000-0002-4315-1058',
  repository: 'https://github.com/mindcraft-research/mindcraft',
  publisher: 'Zenodo',
  license: 'AGPL-3.0-or-later',
}

export const VERSIONS = [
  {
    ...COMMUN,
    version: '0.2.0',
    year: 2026,
    releaseDate: '2026-10-19',
    inUseFrom: '2026-10-20',
    // DOI attribué par Zenodo à la publication de la release.
    doi: null,
    doiUrl: null,
    swhid: null,
    swhidQualified: null,
    swhUrl: null,
    nouveautes: ['préenregistrement', 'cahier de laboratoire', 'préparation du dépôt des données'],
  },
  {
    ...COMMUN,
    version: '0.1.0',
    year: 2026,
    releaseDate: '2026-04-28',
    inUseFrom: '2026-04-28',
    doi: '10.5281/zenodo.19864887',
    doiUrl: 'https://doi.org/10.5281/zenodo.19864887',
    swhid: 'swh:1:rev:df8a8b127f4b7c024a140e56263d0e22927b33eb',
    swhidQualified:
      'swh:1:rev:df8a8b127f4b7c024a140e56263d0e22927b33eb;' +
      'origin=https://github.com/mindcraft-research/mindcraft;' +
      'visit=swh:1:snp:faf5b26ed9e4b9d79a1dbf0ccff0cc33f5514011',
    swhUrl:
      'https://archive.softwareheritage.org/swh:1:rev:df8a8b127f4b7c024a140e56263d0e22927b33eb',
    nouveautes: [],
  },
]

// Version actuelle (page d'accueil, à propos, export…).
export const CITATION_DATA = VERSIONS[0]

const jour = (d) => (d ? String(d instanceof Date ? d.toISOString() : d).slice(0, 10) : null)

// Version utilisée à une date (AAAA-MM-JJ ou Date).
export function versionPourDate(date) {
  const j = jour(date) || jour(new Date())
  return VERSIONS.find((v) => v.inUseFrom <= j) || VERSIONS[VERSIONS.length - 1]
}

// Versions utilisées pendant une collecte (de `debut` à `fin`, aujourd'hui si
// la collecte continue), de la plus ancienne à la plus récente. Sans date de
// début : la version actuelle.
export function versionsPourPeriode(debut, fin) {
  if (!debut) return [CITATION_DATA]
  const d = jour(debut)
  const f = jour(fin) || jour(new Date())
  return VERSIONS.filter((v, i) => {
    const finVersion = i === 0 ? '9999-12-31' : VERSIONS[i - 1].inUseFrom
    return v.inUseFrom <= f && finVersion > d
  }).reverse()
}

// Date « 20 octobre 2026 ».
export const dateLongue = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// ─── Format APA 7e édition (logiciel) ─────────────────────────────────────────
// Forme courte (sans sous-titre) recommandée APA 7 quand le titre est
// déjà non ambigu. Le rôle du descripteur [Computer software] est de
// clarifier la nature de l'œuvre.
export function buildAPA(c = CITATION_DATA) {
  const initial = c.authorGiven.charAt(0)
  return (
    `${c.authorFamily}, ${initial}. (${c.year}). ` +
    `${c.title} (Version ${c.version}) ` +
    `[Computer software]. ${c.publisher}. ` +
    (c.doi ? `https://doi.org/${c.doi}` : c.repository)
  )
}

// ─── Format BibTeX ────────────────────────────────────────────────────────────
export function buildBibTeX(c = CITATION_DATA) {
  const key = `${c.authorFamily.toLowerCase()}_mindcraft_${c.year}`
  return [
    `@software{${key},`,
    `  author    = {${c.authorFamily}, ${c.authorGiven}},`,
    `  title     = {{${c.title}}: ${c.subtitle}},`,
    `  year      = {${c.year}},`,
    `  month     = {${monthName(c.releaseDate)}},`,
    `  version   = {${c.version}},`,
    ...(c.doi ? [`  doi       = {${c.doi}},`] : []),
    `  url       = {${c.repository}},`,
    `  publisher = {${c.publisher}},`,
    `  license   = {${c.license}},`,
    ...(c.swhid ? [`  note      = {Software Heritage: ${c.swhid}},`] : []),
    `  orcid     = {${c.authorOrcid}},`,
    `}`,
  ].join('\n')
}

// ─── Format RIS (Zotero, EndNote, Mendeley) ───────────────────────────────────
export function buildRIS(c = CITATION_DATA) {
  return [
    `TY  - COMP`,
    `AU  - ${c.authorFamily}, ${c.authorGiven}`,
    `TI  - ${c.title}: ${c.subtitle}`,
    `PY  - ${c.year}`,
    `DA  - ${c.releaseDate.replace(/-/g, '/')}`,
    `ET  - ${c.version}`,
    ...(c.doi ? [`DO  - ${c.doi}`] : []),
    `UR  - ${c.repository}`,
    `PB  - ${c.publisher}`,
    `LA  - en`,
    ...(c.swhid ? [`N1  - SWHID: ${c.swhid}`] : []),
    `N1  - ORCID: ${c.authorOrcid}`,
    `N1  - License: ${c.license}`,
    `ER  - `,
  ].join('\n')
}

function monthName(isoDate) {
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ]
  return months[parseInt(isoDate.split('-')[1], 10) - 1] || 'jan'
}
