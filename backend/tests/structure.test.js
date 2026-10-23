// SPDX-License-Identifier: AGPL-3.0-or-later
// Export JSON de la structure d'une étude (lib/structure.js) : toutes les
// références internes doivent pointer sur un élément présent dans le fichier.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { structureEtude, referencesManquantes, SCHEMA_VERSION } from '../src/lib/structure.js'

// Étude telle que renvoyée par loadStudy (routes/export.js).
function etude() {
  return {
    id: 'etude1', projectId: 'projet1',
    name: 'Étude test', description: null, status: 'DRAFT', version: 1,
    createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-02'),
    metadata: {
      i18n: {
        defaultLang: 'fr', languages: ['en'],
        translations: {
          en: {
            'b:bAccueil:title': 'Welcome',
            'q:qAge:text': 'Your age',
            'q:qGenre:c:cF': 'Woman',
            'q:qMat:m:mUn:label': 'Item one',
            'b:bTache:step:sFix:text': 'Look at the cross',
            'fmt:buttons:nextLabel': 'Next',
          },
        },
      },
    },
    blocks: [
      { id: 'bAccueil', studyId: 'etude1', type: 'WELCOME', label: 'Accueil', order: 0, settings: { title: 'Bienvenue' }, questions: [], sequenceSteps: [], stimulusFiles: [] },
      {
        id: 'bQuest', studyId: 'etude1', type: 'QUESTION', label: 'Questions', order: 1,
        settings: { _questionOrder: ['qGenre', 'qAge', 'qMat'] },
        questions: [
          { id: 'qAge', blockId: 'bQuest', code: 'age', type: 'NUMERIC', text: 'Âge', required: true, randomize: false, order: 0, settings: {}, choices: [], matrixItems: [] },
          {
            id: 'qGenre', blockId: 'bQuest', code: 'genre', type: 'RADIO', text: 'Genre', required: true, randomize: false, order: 1,
            settings: { displayCondition: { sourceCode: 'age', operator: 'GREATER_THAN', value: '17' } },
            choices: [{ id: 'cF', questionId: 'qGenre', code: 'F', label: 'Femme', order: 0, anchored: false, mediaUrl: null, mediaType: null }],
            matrixItems: [],
          },
          {
            id: 'qMat', blockId: 'bQuest', code: 'mat', type: 'MATRIX', text: 'Matrice', required: false, randomize: false, order: 2, settings: {},
            choices: [], matrixItems: [{ id: 'mUn', questionId: 'qMat', code: 'm1', label: 'Un', order: 0, reversed: false, left: null, right: null }],
          },
        ],
        sequenceSteps: [], stimulusFiles: [],
      },
      {
        id: 'bLogique', studyId: 'etude1', type: 'LOGIC', label: 'Logique', order: 2,
        settings: { rules: [
          { sourceCode: 'age', operator: 'LESS_THAN', value: '18', targetBlockId: 'bFin' },
          { type: 'CONDITION_ASSIGNMENT', levelId: 'l2', operator: 'EQUALS', action: 'JUMP_TO', targetBlockId: 'bFin' },
        ], defaultTargetBlockId: 'bTache' },
        questions: [], sequenceSteps: [], stimulusFiles: [],
      },
      {
        id: 'bTache', studyId: 'etude1', type: 'STIMULUS', label: 'Tâche', order: 3, settings: {},
        questions: [],
        sequenceSteps: [{ id: 'sFix', blockId: 'bTache', type: 'FIXATION', order: 0, settings: { text: '+' } }],
        stimulusFiles: [{ id: 'f1', filename: 'a.png', originalName: 'a.png', mimetype: 'image/png', size: 10, url: '/api/stimulus/files/f1', category: 'cible', blockId: 'bTache' }],
      },
      { id: 'bFin', studyId: 'etude1', type: 'DEBRIEFING', label: 'Fin', order: 4, settings: {}, questions: [], sequenceSteps: [], stimulusFiles: [] },
    ],
    design: {
      id: 'd1', studyId: 'etude1', designType: 'WITHIN', counterbalanceMethod: 'LATIN_SQUARE', quotaMode: 'STRICT', targetN: 30,
      settings: { abandonAfterHours: 2 },
      factors: [{
        id: 'f1', name: 'Ordre', type: 'WITHIN', order: 0,
        levels: [
          { id: 'l1', code: 'A', name: 'A', order: 0, blockIds: ['bQuest'] },
          { id: 'l2', code: 'B', name: 'B', order: 1, blockIds: ['bTache'] },
        ],
      }],
    },
  }
}

describe('structureEtude', () => {
  it('porte la version 1.1 du format, les id et les réglages du plan', () => {
    const m = structureEtude(etude(), { sessionCount: 3, maintenant: new Date('2026-10-23T10:00:00Z') }).mindcraft
    expect(SCHEMA_VERSION).toBe('1.1')
    expect(m.export.schemaVersion).toBe('1.1')
    expect(m.export.generatedAt).toBe('2026-10-23T10:00:00.000Z')
    expect(m.study.stats).toEqual({ blockCount: 5, questionCount: 3, sessionCount: 3 })
    expect(m.design.settings).toEqual({ abandonAfterHours: 2 })
    expect(m.blocks.map((b) => b.id)).toEqual(['bAccueil', 'bQuest', 'bLogique', 'bTache', 'bFin'])
    expect(m.blocks[1].questions[1].id).toBe('qGenre')
    expect(m.blocks[1].questions[1].choices[0].id).toBe('cF')
    expect(m.blocks[1].questions[2].matrixItems[0].id).toBe('mUn')
    expect(m.blocks[3].sequenceSteps[0].id).toBe('sFix')
  })

  it('ne contient ni identifiants de l\'instance (étude, projet) ni données participant', () => {
    const texte = JSON.stringify(structureEtude(etude()))
    expect(texte).not.toContain('etude1')
    expect(texte).not.toContain('projet1')
    expect(texte).not.toMatch(/"(studyId|projectId|participantId|questionId|blockId)"/)
  })

  it('toutes les références internes sont résolues', () => {
    expect(referencesManquantes(structureEtude(etude()))).toEqual([])
  })
})

describe('referencesManquantes', () => {
  it('signale chaque référence d\'un fichier 1.0 (sans id)', () => {
    const dump = structureEtude(etude())
    const sansId = (o) => { delete o.id; return o }
    for (const b of dump.mindcraft.blocks) {
      sansId(b)
      b.questions.forEach((q) => { sansId(q); q.choices.forEach(sansId); q.matrixItems.forEach(sansId) })
      b.sequenceSteps.forEach(sansId)
    }
    const ou = referencesManquantes(dump).map((r) => r.ou)
    expect(ou).toContain('design : niveau « A » du facteur « Ordre »')
    expect(ou).toContain('bloc-logique « Logique » : règle')
    expect(ou).toContain('bloc-logique « Logique » : cible par défaut')
    expect(ou).toContain('bloc « Questions » : ordre des questions')
    expect(ou).toContain('traduction « q:qAge:text »')
    expect(ou).not.toContain('traduction « fmt:buttons:nextLabel »')
  })

  it('signale un choix ou une étape traduits qui n\'existent plus', () => {
    const e = etude()
    e.metadata.i18n.translations.en['q:qGenre:c:cDisparu'] = 'Gone'
    e.metadata.i18n.translations.en['b:bTache:step:sDisparue:text'] = 'Gone'
    expect(referencesManquantes(structureEtude(e))).toEqual([
      { ou: 'traduction « q:qGenre:c:cDisparu »', id: 'cDisparu' },
      { ou: 'traduction « b:bTache:step:sDisparue:text »', id: 'sDisparue' },
    ])
  })

  it('les fichiers d\'exemple du dépôt (examples/) sont cohérents', () => {
    for (const nom of ['study-structure-example.json', 'study-structure-template.json']) {
      const dump = JSON.parse(readFileSync(new URL(`../../examples/${nom}`, import.meta.url), 'utf8'))
      expect(dump.mindcraft.export.schemaVersion).toBe(SCHEMA_VERSION)
      expect(referencesManquantes(dump)).toEqual([])
    }
  })

  it('accepte un fichier vide ou mal formé sans planter', () => {
    expect(referencesManquantes(null)).toEqual([])
    expect(referencesManquantes({ mindcraft: { blocks: 'x' } })).toEqual([])
  })
})
