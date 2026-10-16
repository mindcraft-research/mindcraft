// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des écarts au préenregistrement (lib/deviations.js, lib/odt.js, lib/zip.js).

import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { detecterEcarts, momentPropose, rapport, resume, validerEcart } from '../src/lib/deviations.js'
import { exporterEcarts } from '../src/lib/deviationsExport.js'
import { structureEtude } from '../src/lib/prereg.js'
import { crc32 } from '../src/lib/zip.js'

// jszip est déjà présent (dépendance d'exceljs) : sert uniquement à relire l'ODT.
const JSZip = createRequire(import.meta.url)('jszip')

const LOCK = new Date('2026-03-01T10:00:00Z')
const jour = (j) => new Date(Date.UTC(2026, 2, j, 12))

const bloc = (codes, extra = {}) => ({ id: 'b1', type: 'QUESTION', settings: { name: 'Mesures' }, questions: codes.map((c, i) => ({ code: c, type: 'LIKERT', text: `Item ${c}`, order: i, choices: [], matrixItems: [] })), stimulusFiles: [], sequenceSteps: [], ...extra })
const etude = ({ codes = ['Q1', 'Q2'], niveaux = ['GAIN', 'PERTE'], targetN = 100, taches = ['Stroop'], version = 3, factorCree = new Date('2026-01-01') } = {}) => ({
  version, status: 'COMPLETED',
  blocks: [bloc(codes), ...taches.map((t, i) => ({ id: `s${i}`, type: 'STIMULUS', settings: { name: t }, questions: [], stimulusFiles: [], sequenceSteps: [] }))],
  design: {
    designType: 'BETWEEN', counterbalanceMethod: 'LATIN_SQUARE', targetN, settings: {}, updatedAt: new Date('2026-01-01'),
    factors: [{ name: 'cadrage', type: 'BETWEEN', createdAt: factorCree, levels: niveaux.map((c) => ({ name: c.toLowerCase(), code: c })) }],
  },
})

// Contexte : préenregistrement verrouillé sur l'étude de référence.
function contexte(apres, { sessionsAtLock = 0, termines = 100, collecteEnCours = false, versions = [], amendments = [], ecartsCahier = [], premierExport = null } = {}) {
  const structure = structureEtude(etude(), { nbSessions: sessionsAtLock })
  return {
    prereg: { structure, amendments }, study: apres, lockedAt: LOCK,
    premiereSession: jour(5), derniereActivite: jour(20), collecteEnCours, termines, premierExport,
    versions, ecartsCahier, objectifModifieLe: null,
  }
}
const cles = (e) => e.map((x) => x.key)

describe('detecterEcarts', () => {
  it('aucun écart quand l’étude suit le préenregistrement', () => {
    expect(detecterEcarts(contexte(etude()))).toEqual([])
  })
  it('données avant le verrouillage : majeur', () => {
    const [e] = detecterEcarts(contexte(etude(), { sessionsAtLock: 4 }))
    expect(e).toMatchObject({ key: 'DONNEES_AVANT_VERROU', categorie: 'MAJEUR' })
    expect(e.description).toMatch(/^4 participants avaient commencé/)
  })
  it('conditions retirées et ajoutées : majeur', () => {
    const e = detecterEcarts(contexte(etude({ niveaux: ['GAIN', 'NEUTRE'] })))
    expect(cles(e)).toEqual(expect.arrayContaining(['NIVEAU_RETIRE:cadrage:PERTE', 'NIVEAU_AJOUTE:cadrage:NEUTRE']))
    expect(e.filter((x) => x.key.startsWith('NIVEAU')).every((x) => x.categorie === 'MAJEUR')).toBe(true)
  })
  it('mesure supprimée : majeur ; ajoutée : mineur, datée par la version', () => {
    const versions = [
      { version: 4, createdAt: jour(3), snapshot: { blocks: [bloc(['Q1', 'Q2'])] } },
      { version: 5, createdAt: jour(8), snapshot: { blocks: [bloc(['Q1', 'Q3'])] } },
    ]
    const e = detecterEcarts(contexte(etude({ codes: ['Q1', 'Q3'], version: 5 }), { versions }))
    const sup = e.find((x) => x.key === 'MESURE_SUPPRIMEE:Q2')
    const aj = e.find((x) => x.key === 'MESURE_AJOUTEE:Q3')
    expect(sup.categorie).toBe('MAJEUR')
    expect(aj.categorie).toBe('MINEUR')
    expect(aj.description).toMatch(/exploratoire/)
    expect(sup.quand).toEqual(jour(8))
  })
  it('tâche supprimée : majeur', () => {
    expect(detecterEcarts(contexte(etude({ taches: [] })))).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'TACHE_SUPPRIMEE:Stroop', categorie: 'MAJEUR' })]))
  })
  it('effectif final : mineur sous 10 %, majeur au-delà', () => {
    expect(detecterEcarts(contexte(etude(), { termines: 95 }))[0]).toMatchObject({ key: 'EFFECTIF', categorie: 'MINEUR', quand: 'FIN_COLLECTE' })
    expect(detecterEcarts(contexte(etude(), { termines: 80 }))[0]).toMatchObject({ key: 'EFFECTIF', categorie: 'MAJEUR' })
    expect(detecterEcarts(contexte(etude(), { termines: 80 }))[0].description).toMatch(/80 participants ayant terminé, pour 100 prévus \(−20 %\)/)
  })
  it('pendant la collecte : seul un objectif modifié est signalé', () => {
    expect(detecterEcarts(contexte(etude(), { collecteEnCours: true, termines: 10 }))).toEqual([])
    expect(detecterEcarts(contexte(etude({ targetN: 120 }), { collecteEnCours: true }))[0]).toMatchObject({ key: 'OBJECTIF', categorie: 'MAJEUR' })
  })
  it('matériel modifié : mineur ; amendements et cahier repris', () => {
    const modifiee = etude()
    modifiee.blocks[0].questions[0].text = 'Item reformulé'
    const e = detecterEcarts(contexte(modifiee, {
      amendments: [{ id: 'a1', category: 'PRECISION', content: 'Clarification', createdAt: jour(2) }],
      ecartsCahier: [{ id: 'n1', content: 'Coupure wifi', createdAt: jour(9) }],
    }))
    expect(e.find((x) => x.key === 'MATERIEL').categorie).toBe('MINEUR')
    expect(e.find((x) => x.key === 'AMENDEMENT:a1').categorie).toBe('PRECISION')
    expect(e.find((x) => x.key === 'CAHIER:n1').description).toBe('Noté dans le cahier de labo : Coupure wifi')
  })
  it('textes en anglais', () => {
    expect(detecterEcarts(contexte(etude(), { termines: 80 }), 'en')[0].description).toMatch(/^Final sample: 80 participants/)
  })
})

describe('momentPropose', () => {
  const ctx = { lockedAt: LOCK, premiereSession: jour(5), derniereActivite: jour(20), collecteEnCours: false, premierExport: jour(25) }
  it('situe l’écart par rapport au verrouillage, à la collecte et au premier export', () => {
    expect(momentPropose(jour(1), { ...ctx, lockedAt: jour(2) })).toMatch(/^Avant le verrouillage/)
    expect(momentPropose(jour(3), ctx)).toMatch(/avant le premier participant/)
    expect(momentPropose(jour(10), ctx)).toMatch(/^Pendant la collecte, avant tout accès/)
    expect(momentPropose(jour(22), ctx)).toMatch(/^Après la collecte, avant tout accès/)
    expect(momentPropose(jour(26), ctx)).toMatch(/^Après un premier accès aux données \(premier export le 25 mars 2026\)/)
    expect(momentPropose(null, ctx)).toMatch(/date exacte non enregistrée/)
  })
  it('fin de collecte, avec ou sans accès préalable aux données', () => {
    expect(momentPropose('FIN_COLLECTE', ctx)).toMatch(/^À la fin de la collecte, avant tout accès/)
    expect(momentPropose('FIN_COLLECTE', { ...ctx, premierExport: jour(10) })).toMatch(/après un premier accès/)
  })
  it('fin de collecte = sortie du statut « En collecte » quand elle est connue', () => {
    // Export après le dernier participant mais avant la clôture : accès pendant la collecte.
    const c = { ...ctx, premierExport: jour(22), finCollecte: jour(24) }
    expect(momentPropose('FIN_COLLECTE', c)).toMatch(/après un premier accès/)
    expect(momentPropose(jour(21), { ...c, premierExport: null })).toMatch(/^Pendant la collecte/)
  })
})

describe('rapport et validation', () => {
  const ctx = contexte(etude(), { termines: 80 })
  const detectes = detecterEcarts(ctx)
  it('fusionne les annotations du chercheur et ajoute les écarts déclarés', () => {
    const lignes = rapport(detectes, [
      { id: 'd1', key: 'EFFECTIF', category: 'MINEUR', moment: null, reason: 'Fin d’année', impact: 'Puissance 0,72', updatedAt: jour(28) },
      { id: 'd2', key: null, category: 'MAJEUR', description: 'Test changé : Welch au lieu de Student', moment: 'Avant l’analyse', reason: 'Variances inégales', impact: '' , createdAt: jour(27) },
    ], ctx)
    expect(lignes[0]).toMatchObject({ key: null, categorie: 'MAJEUR', detecte: false })
    expect(lignes[1]).toMatchObject({ key: 'EFFECTIF', categorie: 'MINEUR', categorieProposee: 'MAJEUR', raison: 'Fin d’année', detecte: true })
    expect(lignes[1].moment).toMatch(/^À la fin de la collecte/)
    expect(resume(lignes)).toEqual({ MAJEUR: 1, MINEUR: 1, PRECISION: 0, SANS_OBJET: 0 })
  })
  it('« sans objet » exige une raison ; un écart déclaré exige une description', () => {
    expect(validerEcart({ category: 'SANS_OBJET' }).erreur).toMatch(/Raison/)
    expect(validerEcart({ category: 'MAJEUR' }, { manuel: true }).erreur).toMatch(/Décrivez/)
    expect(validerEcart({ category: 'INCONNUE' }).erreur).toBeTruthy()
    expect(validerEcart({ category: 'MINEUR', reason: ' x ' }).donnees).toMatchObject({ category: 'MINEUR', reason: 'x' })
  })
})

describe('export', () => {
  const ctx = contexte(etude(), { termines: 80 })
  const r = {
    langue: 'fr', ctx,
    prereg: { answers: { title: 'Étude <test> & co' }, lockedAt: LOCK, fingerprint: 'ab'.repeat(32) },
    lignes: rapport(detecterEcarts(ctx), [{ key: null, category: 'MAJEUR', description: 'Ligne 1\nLigne 2', reason: 'R, "citée"', impact: '', createdAt: jour(27) }], ctx),
  }
  it('ODT valide : archive lisible, mimetype en tête, contenu échappé', async () => {
    const { buffer, type } = exporterEcarts(r, { format: 'odt', lien: 'https://ex.org/prereg/x' })
    expect(type).toBe('application/vnd.oasis.opendocument.text')
    expect(buffer.subarray(30, 38).toString()).toBe('mimetype')
    const zip = await JSZip.loadAsync(buffer)
    expect(await zip.file('mimetype').async('string')).toBe('application/vnd.oasis.opendocument.text')
    const contenu = await zip.file('content.xml').async('string')
    expect(contenu).toContain('Étude &lt;test&gt; &amp; co')
    expect(contenu).toContain('Écarts au préenregistrement')
    expect(contenu).toContain('<text:p text:style-name="P">Ligne 2</text:p>')
    expect(contenu).toContain('2 écarts : 2 majeurs.')
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(['META-INF/manifest.xml', 'styles.xml']))
  })
  it('CSV : BOM, en-têtes, champs échappés', () => {
    const csv = exporterEcarts(r, { format: 'csv' }).buffer.toString('utf8')
    expect(csv.startsWith('﻿numero,ecart,origine,categorie,moment,raison,impact\n')).toBe(true)
    expect(csv).toContain('"R, ""citée"""')
    expect(csv).toContain('"Ligne 1\nLigne 2"')
  })
  it('CRC32 conforme', () => {
    expect(crc32(Buffer.from('123456789')).toString(16)).toBe('cbf43926')
  })
})
