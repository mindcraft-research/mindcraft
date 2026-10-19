// SPDX-License-Identifier: AGPL-3.0-or-later
// README du paquet de dépôt (onglet Open Science → Préparer le dépôt), en
// Markdown, à partir des métadonnées Open Science, de l'étude et des
// fichiers du paquet. Le chercheur peut ensuite le modifier librement.

import { buildAPA, versionsPourPeriode, dateLongue } from './citation'

export const LIENS_LICENCES = {
  'CC-BY-4.0': ['CC-BY 4.0', 'https://creativecommons.org/licenses/by/4.0/deed.fr'],
  'Etalab-2.0': ['Licence Ouverte 2.0 (Etalab)', 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/'],
  'CC0-1.0': ['CC0 1.0 (domaine public)', 'https://creativecommons.org/publicdomain/zero/1.0/deed.fr'],
  'CC-BY-SA-4.0': ['CC-BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr'],
  'CC-BY-NC-4.0': ['CC-BY-NC 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/deed.fr'],
}
const PLANS = { BETWEEN: 'inter-sujets', WITHIN: 'intra-sujets', MIXED: 'mixte', NONE: 'non expérimental (pas de facteur manipulé)' }
const LANGUES = { fr: 'français', en: 'anglais', de: 'allemand', es: 'espagnol', it: 'italien', nl: 'néerlandais', pt: 'portugais' }

const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')
const ligne = (libelle, valeur) => (valeur ? `- **${libelle}** : ${valeur}` : null)
const bloc = (titre, lignes) => {
  const l = lignes.filter(Boolean)
  return l.length ? [`## ${titre}`, '', ...l, ''] : []
}

// donnees : { nParticipants, exclusions: [{ raison }], pseudonymise,
//   terminesSeulement, colonnesRetirees: [] } ; fichiers : [{ nom, description }]
// prereg : { texte, url } (état affiché dans l'onglet Open Science).
export function genererReadme({ study, prereg, fichiers, donnees = {}, date = new Date() }) {
  const m = study.metadata || {}
  const auteurs = (m.datasetAuthors || []).filter((a) => a?.name?.trim())
  const nomsAuteurs = auteurs.map((a) => a.name.trim()).join(', ')
  const licence = m.dataLicense === 'autre' ? [m.dataLicenseOther || 'à préciser'] : LIENS_LICENCES[m.dataLicense]
  const facteurs = (study.design?.factors || []).map((f) => `${f.name} (${f.type === 'WITHIN' ? 'intra' : 'inter'} : ${(f.levels || []).map((l) => l.name).join(', ')})`)
  const langues = [m.i18n?.defaultLang || 'fr', ...(m.i18n?.languages || [])].map((l) => LANGUES[l] || l)
  const periode = m.collectionStart || m.collectionEnd
    ? `du ${dateFr(m.collectionStart) || '…'} au ${dateFr(m.collectionEnd) || '… (en cours)'}`
    : ''
  const acces = m.accessType === 'embargo'
    ? `embargo jusqu’au ${dateFr(m.embargoDate) || '…'}`
    : m.accessType === 'restreint' ? `sur demande${m.accessConditions ? ` (${m.accessConditions})` : ''}` : m.accessType === 'ouvert' ? 'ouvert' : ''
  const excl = donnees.exclusions || []
  // Version(s) de MindCraft utilisée(s) pendant la collecte (période de
  // l'onglet Open Science) : celle(s) à citer.
  const versions = versionsPourPeriode(m.collectionStart, m.collectionEnd)
  const nomsVersions = versions.map((v) => `MindCraft ${v.version}`).join(' puis ')
  const passage = versions.length > 1
    ? ` (la v${versions[versions.length - 1].version} est utilisée à partir du ${dateLongue(versions[versions.length - 1].inUseFrom)})`
    : ''

  const sections = [
    `# ${study.name}`, '',
    ...(study.description ? [study.description, ''] : []),
    ...bloc('Auteurs', [
      ...auteurs.map((a) => `- ${a.name.trim()}${a.affiliation ? ` (${a.affiliation})` : ''}${a.orcid ? ` — ORCID : https://orcid.org/${a.orcid.trim()}` : ''}`),
      (m.contactName || m.contactEmail) ? `\nContact : ${[m.contactName, m.contactEmail && `<${m.contactEmail}>`].filter(Boolean).join(' ')}` : null,
    ]),
    ...bloc('Citer ces données', [
      `${nomsAuteurs || '[Auteurs]'} (${new Date(date).getFullYear()}). *${study.name}* [Jeu de données]. [Entrepôt]. [DOI attribué au dépôt]`,
    ]),
    ...bloc('Projet', [
      ligne('Titre', m.projectTitle),
      ligne('Description', m.projectDescription),
      ligne('DOI du projet', m.projectDoi),
      ligne('Financement', m.funding),
      ligne('Avis éthique', [m.projectEthicsNumber, m.studyEthicsNumber && `${m.studyEthicsNumber} (étude)`].filter(Boolean).join(' ; ')),
    ]),
    ...bloc('Méthode', [
      ligne('Période de collecte', periode),
      ligne('Participants', [m.sampleSize, donnees.nParticipants != null && `Les fichiers de données contiennent ${donnees.nParticipants} participant${donnees.nParticipants > 1 ? 's' : ''}.`].filter(Boolean).join(' ')),
      ligne('Population et recrutement', m.population),
      ligne('Plan', [study.design?.designType && PLANS[study.design.designType], facteurs.length && `facteurs : ${facteurs.join(' ; ')}`].filter(Boolean).join(', ')),
      ligne('Langue de passation', langues.join(', ')),
      ligne('Préenregistrement', prereg?.url ? `${prereg.texte} — ${prereg.url}` : prereg?.texte),
      ligne('Publication associée', m.relatedPublication),
      `- **Passation** : en ligne, avec ${nomsVersions}${passage} (voir « Logiciel » ci-dessous).`,
    ]),
    ...bloc('Fichiers', [
      '| Fichier | Contenu |', '|---|---|',
      ...fichiers.map((f) => `| ${f.nom} | ${(f.description || '').replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
    ]),
    ...bloc('Données', [
      '- Format : CSV (séparateur virgule, encodage UTF-8). La signification de chaque colonne est décrite dans le codebook.',
      donnees.pseudonymise ? '- Les identifiants des participants ont été remplacés par des numéros (P001, P002…), les mêmes dans tous les fichiers.' : null,
      donnees.terminesSeulement ? '- Seuls les participants ayant terminé l’étude figurent dans les données.' : null,
      excl.length ? `- ${excl.length} participant${excl.length > 1 ? 's' : ''} exclu${excl.length > 1 ? 's' : ''} avant le dépôt : ${excl.map((e) => e.raison).join(' ; ')}.` : null,
      donnees.colonnesRetirees?.length ? `- Colonnes retirées avant le dépôt : ${donnees.colonnesRetirees.join(', ')}.` : null,
    ]),
    ...bloc('Anonymisation', [m.anonymisation]),
    ...bloc('Licence et accès', [
      ligne('Licence', licence ? licence.filter(Boolean).join(' — ') : ''),
      ligne('Accès', acces),
    ]),
    ...bloc('Logiciel', versions.map((v) => `- ${buildAPA(v)}${v.doi ? '' : ' (DOI attribué par Zenodo à la publication de la version)'}`)),
    ...bloc('Mots-clés', [(m.keywords || []).join(', ')]),
    `*README préparé avec MindCraft le ${dateFr(date)}. Relisez-le et complétez-le avant le dépôt.*`, '',
  ]
  return sections.join('\n')
}
