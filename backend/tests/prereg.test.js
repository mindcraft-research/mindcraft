// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du préenregistrement (lib/prereg.js).

import { describe, it, expect } from 'vitest'
import {
  MODELE_OSF, validerBrouillon, manquants, suggestions, structureEtude, empreintePrereg, versionAnonyme, genererPdfPrereg,
} from '../src/lib/prereg.js'

const etude = (extra = {}) => ({
  name: 'Cadrage et décision', version: 4,
  blocks: [
    { id: 'b0', type: 'WELCOME', settings: { name: 'Accueil' }, questions: [] },
    {
      id: 'b1', type: 'QUESTION', settings: { name: 'Mesures', randomGroup: 'A' },
      questions: [
        { code: 'Q_RISQUE', type: 'LIKERT', text: '<p>Quel risque&nbsp;<strong>percevez-vous</strong> ?</p>' },
        { code: 'INFO', type: 'DISPLAY', text: '<p>Merci</p>' },
      ],
    },
    { id: 'b2', type: 'QUESTION', settings: { name: 'Contrôles', randomGroup: 'A' }, questions: [{ code: 'AGE', type: 'NUMBER', text: 'Âge' }] },
    { id: 'b3', type: 'STIMULUS', settings: { name: 'Stroop' }, questions: [] },
  ],
  design: {
    designType: 'BETWEEN', counterbalanceMethod: 'LATIN_SQUARE', targetN: 120, settings: { abandonAfterHours: 24 },
    factors: [{ name: 'cadrage', type: 'BETWEEN', levels: [{ name: 'Gain', code: 'GAIN' }, { name: 'Perte', code: 'PERTE' }] }],
  },
  ...extra,
})

describe('validerBrouillon', () => {
  it('garde les questions du modèle, ignore les clés inconnues', () => {
    const { donnees } = validerBrouillon({ language: 'en', answers: { hypotheses: 'H1', inconnue: 'x', studyType: 'experiment', blinding: ['none', 'none'] } })
    expect(donnees.language).toBe('en')
    expect(donnees.answers).toEqual({ hypotheses: 'H1', studyType: 'experiment', blinding: ['none'] })
  })
  it('refuse un choix hors des options, un texte trop long, un e-mail invalide', () => {
    expect(validerBrouillon({ answers: { studyType: 'inventé' } }).erreur).toBeTruthy()
    expect(validerBrouillon({ answers: { title: 'x'.repeat(301) } }).erreur).toMatch(/300/)
    expect(validerBrouillon({ authors: [{ name: 'A', email: 'pas-un-mail' }] }).erreur).toMatch(/e-mail/)
  })
  it('langue inconnue → fr ; lignes d’auteur vides ignorées', () => {
    const { donnees } = validerBrouillon({ language: 'de', authors: [{ name: '', affiliation: '', email: '' }, { name: 'Ada', email: 'ada@ex.org' }] })
    expect(donnees.language).toBe('fr')
    expect(donnees.authors).toEqual([{ name: 'Ada', affiliation: '', email: 'ada@ex.org' }])
  })
})

describe('manquants', () => {
  it('titre et hypothèses obligatoires', () => {
    expect(manquants({ answers: {} }).obligatoires).toEqual(['Titre', 'Hypothèses'])
    expect(manquants({ answers: { title: 'T', hypotheses: 'H1' } }).obligatoires).toEqual([])
  })
  it('les questions facultatives ne sont pas signalées', () => {
    const { vides } = manquants({ answers: { title: 'T', hypotheses: 'H1' } })
    expect(vides).toContain('Taille d’échantillon')
    expect(vides).not.toContain('Analyses exploratoires')
  })
})

describe('suggestions', () => {
  it('déduit plan, conditions, randomisation, effectif, règle d’arrêt et mesures', () => {
    const s = suggestions(etude(), { nbSessions: 0 })
    expect(s.title).toBe('Cadrage et décision')
    expect(s.studyType).toBe('experiment')
    expect(s.existingData).toBe('beforeCreation')
    expect(s.studyDesign).toMatch(/^Plan inter-sujets 2 \(2 conditions\)/)
    expect(s.manipulatedVariables).toBe('- cadrage : Gain (GAIN), Perte (PERTE)')
    expect(s.randomization).toMatch(/Attribution aléatoire/)
    expect(s.randomization).toMatch(/« Mesures », « Contrôles »/)
    expect(s.sampleSize).toBe('120 participants.')
    expect(s.stoppingRule).toMatch(/120 participants.*24 h/)
    expect(s.measuredVariables).toBe('- Q_RISQUE : Quel risque percevez-vous ?\n- AGE : Âge\n- Tâche « Stroop » : réponse et temps de réaction à chaque essai.')
  })
  it('en anglais ; données existantes non proposées si des participants ont commencé', () => {
    const s = suggestions(etude(), { nbSessions: 3, langue: 'en' })
    expect(s.existingData).toBeUndefined()
    expect(s.sampleSize).toBe('120 participants.')
    expect(s.studyDesign).toMatch(/^Between-subjects design/)
  })
  it('étude sans design : pas de variables manipulées', () => {
    const s = suggestions(etude({ design: { designType: 'NONE', factors: [], targetN: 30 } }))
    expect(s.studyType).toBeUndefined()
    expect(s.manipulatedVariables).toBeUndefined()
    expect(s.studyDesign).toMatch(/sans manipulation/)
  })
})

describe('structure, empreinte, anonymat', () => {
  it('structure au verrouillage : objectif, conditions, mesures, participants, empreinte du matériel', () => {
    const st = structureEtude(etude(), { nbSessions: 2 })
    expect(st).toMatchObject({ studyVersion: 4, targetN: 120, designType: 'BETWEEN', measures: ['Q_RISQUE', 'AGE'], tasks: ['Stroop'], sessionsAtLock: 2 })
    expect(st.factors[0].levels.map((l) => l.code)).toEqual(['GAIN', 'PERTE'])
    expect(st.materialFingerprint).toMatch(/^[0-9a-f]{64}$/)
  })
  it('empreinte stable, et différente dès qu’un mot change', () => {
    const base = { template: 'OSF', language: 'fr', answers: { hypotheses: 'H1', title: 'T' }, authors: [], lockedAt: '2026-10-16T10:00:00Z' }
    expect(empreintePrereg(base)).toBe(empreintePrereg({ ...base, answers: { title: 'T', hypotheses: 'H1' } }))
    expect(empreintePrereg({ ...base, answers: { title: 'T', hypotheses: 'H2' } })).not.toBe(empreintePrereg(base))
  })
  it('version anonyme : sans auteurs ni noms', () => {
    const v = versionAnonyme({ authors: [{ name: 'Ada' }], lockedByName: 'ada', amendments: [{ content: 'x', authorName: 'ada' }] })
    expect(v.authors).toEqual([])
    expect(v.lockedByName).toBe(null)
    expect(v.amendments[0].authorName).toBe(null)
  })
})

describe('PDF', () => {
  it('produit un PDF, brouillon ou verrouillé, anonyme ou non', async () => {
    const p = {
      template: 'OSF', language: 'fr', status: 'LOCKED', lockedAt: new Date(), fingerprint: 'a'.repeat(64),
      answers: { title: 'Étude → test 😀', hypotheses: 'H1 : effet ≥ 0', studyType: 'experiment', blinding: ['participants'] },
      authors: [{ name: 'Ada', affiliation: 'Univ' }],
      amendments: [{ category: 'MINEUR', content: 'N réduit', authorName: 'ada', createdAt: new Date() }],
    }
    for (const opts of [{}, { anonyme: true, urlVerification: 'https://ex.org/prereg/x' }]) {
      const buf = await genererPdfPrereg(p, opts)
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
    }
    const brouillon = await genererPdfPrereg({ ...p, status: 'DRAFT', language: 'en', amendments: [] })
    expect(brouillon.length).toBeGreaterThan(1000)
  })
  it('le modèle OSF compte 25 questions en 6 sections', () => {
    expect(MODELE_OSF.sections).toHaveLength(6)
    expect(MODELE_OSF.sections.flatMap((s) => s.questions)).toHaveLength(25)
  })
})
