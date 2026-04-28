// SPDX-License-Identifier: AGPL-3.0-or-later
// Source unique de vérité pour la citation de MindCraft.
// À mettre à jour à chaque release : bumper `version`, `releaseDate`, `doi`,
// `swhid` et `swhidQualified` puis push sur main.

export const CITATION_DATA = {
  title: 'MindCraft',
  subtitle: 'Open-source platform for online behavioural experiments',
  authorFamily: 'DAVID',
  authorGiven: 'Dayle',
  authorOrcid: '0000-0002-4315-1058',
  year: 2026,
  version: '0.1.0',
  releaseDate: '2026-04-28',
  doi: '10.5281/zenodo.19864887',
  doiUrl: 'https://doi.org/10.5281/zenodo.19864887',
  swhid: 'swh:1:rev:df8a8b127f4b7c024a140e56263d0e22927b33eb',
  swhidQualified:
    'swh:1:rev:df8a8b127f4b7c024a140e56263d0e22927b33eb;' +
    'origin=https://github.com/mindcraft-research/mindcraft;' +
    'visit=swh:1:snp:faf5b26ed9e4b9d79a1dbf0ccff0cc33f5514011',
  swhUrl:
    'https://archive.softwareheritage.org/swh:1:rev:df8a8b127f4b7c024a140e56263d0e22927b33eb',
  repository: 'https://github.com/mindcraft-research/mindcraft',
  publisher: 'Zenodo',
  license: 'AGPL-3.0-or-later',
}

// ─── Format APA 7e édition (logiciel) ─────────────────────────────────────────
export function buildAPA(c = CITATION_DATA) {
  const initial = c.authorGiven.charAt(0)
  return (
    `${c.authorFamily}, ${initial}. (${c.year}). ` +
    `${c.title}: ${c.subtitle} (Version ${c.version}) ` +
    `[Computer software]. ${c.publisher}. ` +
    `https://doi.org/${c.doi}`
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
    `  doi       = {${c.doi}},`,
    `  url       = {${c.repository}},`,
    `  publisher = {${c.publisher}},`,
    `  license   = {${c.license}},`,
    `  note      = {Software Heritage: ${c.swhid}},`,
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
    `DO  - ${c.doi}`,
    `UR  - ${c.repository}`,
    `PB  - ${c.publisher}`,
    `LA  - en`,
    `N1  - SWHID: ${c.swhid}`,
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
