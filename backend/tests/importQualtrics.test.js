// SPDX-License-Identifier: AGPL-3.0-or-later
// Conversion Qualtrics (.qsf) → structure MindCraft (lib/importQualtrics.js).
// Jeu d'essai réel : extrait du questionnaire COVID Wave 4 de CMU Delphi
// (tests/fixtures/qualtrics, MIT). Cas particuliers : petit .qsf ci-dessous.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { estQualtrics } from '../src/lib/importQualtrics.js'
import { lireFichierImport, preparerImport } from '../src/lib/importStructure.js'
import { referencesManquantes } from '../src/lib/structure.js'

const questions = (dump) => dump.mindcraft.blocks.flatMap((b) => b.questions)
const parCode = (dump, code) => questions(dump).find((q) => q.code === code)

describe('questionnaire réel (COVID Wave 4, extrait)', () => {
  const lu = lireFichierImport(readFileSync(new URL('./fixtures/qualtrics/covid_wave4_extrait.qsf', import.meta.url)))
  const { dump } = lu

  it('blocs dans l\'ordre du déroulé, filtre de départ en bloc logique, message de fin', () => {
    expect(lu.source).toBe('Qualtrics')
    expect(dump.mindcraft.study.name).toBe('Survey of COVID-Like Illness - Wave 4')
    expect(dump.mindcraft.blocks.map((b) => b.type)).toEqual(['QUESTION', 'LOGIC', 'QUESTION', 'QUESTION', 'DEBRIEFING'])
    expect(dump.mindcraft.blocks[1].settings).toEqual({
      rules: [{ type: 'RESPONSE_VALUE', sourceQuestionCode: 'S1', operator: 'EQUALS', value: '2', action: 'END_STUDY' }],
      defaultAction: 'CONTINUE',
    })
  })

  it('types et codes d\'export', () => {
    expect(parCode(dump, 'S1').type).toBe('RADIO')
    expect(parCode(dump, 'B2').type).toBe('CHECKBOX')
    expect(parCode(dump, 'A1')).toMatchObject({ type: 'MATRIX', settings: { columns: 2, columnLabels: ['Yes', 'No'] } })
    expect(parCode(dump, 'A1').matrixItems.map((i) => i.code)).toEqual(['1', '2', '3', '4', '5'])
    expect(parCode(dump, 'B2b')).toMatchObject({ type: 'NUMERIC', settings: { min: 0 } })
    expect(['A5_1', 'A5_2', 'A5_3'].map((c) => parCode(dump, c)?.type)).toEqual(['NUMERIC', 'NUMERIC', 'NUMERIC'])
    expect(questions(dump).filter((q) => q.type === 'PAGE_BREAK')).toHaveLength(3)
  })

  it('logique d\'affichage : choix cochés, ET / OU, « au moins un choix »', () => {
    expect(parCode(dump, 'B10').settings.displayCondition).toEqual({ sourceCode: 'B8', operator: 'EQUALS', value: '1' })
    expect(parCode(dump, 'B2c').settings.displayCondition.combinator).toBe('AND')
    expect(parCode(dump, 'B2c').settings.displayCondition.conditions[0]).toEqual({ sourceCode: 'B2', operator: 'NOT_CONTAINS', value: '15' })
    expect(parCode(dump, 'B12').settings.displayCondition.combinator).toBe('OR')
    expect(parCode(dump, 'B2b').settings.displayCondition).toEqual({ sourceCode: 'B2c', operator: 'IS_NOT_EMPTY', value: '' })
  })

  it('traductions : langues connues de MindCraft, une seule par langue', () => {
    const i18n = dump.mindcraft.study.metadata.i18n
    expect(i18n).toMatchObject({ defaultLang: 'en', languages: ['es', 'fr'] })
    const s1 = parCode(dump, 'S1')
    expect(i18n.translations.fr[`q:${s1.id}:text`]).toBeTruthy()
    expect(lu.avertissements.join(' ')).toContain('ES-ES, VI')
  })

  it('s\'importe sans erreur ni lien cassé', () => {
    expect(referencesManquantes(dump)).toEqual([])
    const p = preparerImport(dump)
    expect(p.erreurs).toEqual([])
    expect(p.resume.questions).toBe(questions(dump).length)
  })
})

// Petit questionnaire fabriqué pour les cas absents de l'extrait réel.
function qsf() {
  const sq = (p) => ({ SurveyID: 'SV_t', Element: 'SQ', PrimaryAttribute: p.QuestionID, Payload: { Validation: { Settings: { ForceResponse: 'OFF' } }, Language: [], ...p } })
  return {
    SurveyEntry: { SurveyID: 'SV_t', SurveyName: 'Essai', SurveyLanguage: 'FR' },
    SurveyElements: [
      { Element: 'BL', Payload: [
        { Type: 'Default', Description: 'Intro', ID: 'BL_1', BlockElements: [{ Type: 'Page Break' }, { Type: 'Question', QuestionID: 'QID1' }, { Type: 'Question', QuestionID: 'QID2' }, { Type: 'Page Break' }] },
        { Type: 'Standard', Description: 'Texte A', ID: 'BL_A', BlockElements: [{ Type: 'Question', QuestionID: 'QID3' }] },
        { Type: 'Standard', Description: 'Texte B', ID: 'BL_B', BlockElements: [{ Type: 'Question', QuestionID: 'QID4' }] },
        { Type: 'Standard', Description: 'Ordre 1', ID: 'BL_O1', BlockElements: [{ Type: 'Question', QuestionID: 'QID5' }] },
        { Type: 'Standard', Description: 'Ordre 2', ID: 'BL_O2', BlockElements: [{ Type: 'Question', QuestionID: 'QID6' }], Options: { RandomizeQuestions: 'RandomWithXPerPage' } },
        { Type: 'Standard', Description: 'Suite', ID: 'BL_S', BlockElements: [{ Type: 'Question', QuestionID: 'QID7' }, { Type: 'Question', QuestionID: 'QID8' }] },
        { Type: 'Trash', Description: 'Corbeille', ID: 'BL_T', BlockElements: [{ Type: 'Question', QuestionID: 'QID9' }] },
      ] },
      { Element: 'FL', Payload: { Type: 'Root', Flow: [
        { Type: 'Block', ID: 'BL_1' },
        { Type: 'Randomizer', SubSet: 1, Flow: [{ Type: 'Standard', ID: 'BL_A' }, { Type: 'Standard', ID: 'BL_B' }] },
        { Type: 'Randomizer', SubSet: 2, Flow: [{ Type: 'Standard', ID: 'BL_O1' }, { Type: 'Standard', ID: 'BL_O2' }] },
        { Type: 'Branch', BranchLogic: { 0: { 0: { LogicType: 'Question', LeftOperand: 'q://QID1/SelectableChoice/1', Operator: 'Selected', Type: 'Expression' }, Type: 'If' }, Type: 'BooleanExpression' },
          Flow: [{ Type: 'Standard', ID: 'BL_S' }] },
        { Type: 'EmbeddedData', EmbeddedData: [{ Field: 'PROLIFIC_PID' }] },
      ] } },
      sq({ QuestionID: 'QID1', DataExportTag: 'accord', QuestionType: 'MC', Selector: 'SAVR', QuestionText: 'D\'accord ?', Choices: { 1: { Display: 'Oui' }, 2: { Display: 'Non' }, 3: { Display: 'Autre', TextEntry: 'on' } }, ChoiceOrder: [1, 2, 3], RecodeValues: { 1: '1', 2: '0', 3: '9' }, Validation: { Settings: { ForceResponse: 'ON' } } }),
      sq({ QuestionID: 'QID2', DataExportTag: 'nps', QuestionType: 'MC', Selector: 'NPS', QuestionText: 'Recommanderiez-vous ?' }),
      sq({ QuestionID: 'QID3', DataExportTag: 'txtA', QuestionType: 'DB', Selector: 'TB', QuestionText: 'Version A (vous avez répondu ${q://QID1/ChoiceGroup/SelectedChoices})' }),
      sq({ QuestionID: 'QID4', DataExportTag: 'txtB', QuestionType: 'DB', Selector: 'TB', QuestionText: 'Version B ${e://Field/PROLIFIC_PID}' }),
      sq({ QuestionID: 'QID5', DataExportTag: 'curseur', QuestionType: 'Slider', Selector: 'HSLIDER', QuestionText: 'Curseurs', Configuration: { CSSliderMin: 0, CSSliderMax: 10 }, Choices: { 1: { Display: 'Joie' }, 2: { Display: 'Peur' } }, ChoiceOrder: [1, 2] }),
      sq({ QuestionID: 'QID6', DataExportTag: 'classe', QuestionType: 'RO', Selector: 'DND', QuestionText: 'Classez', Choices: { 1: { Display: 'X' }, 2: { Display: 'Y' } } }),
      sq({ QuestionID: 'QID7', DataExportTag: 'sbs', QuestionType: 'SBS', Selector: 'SBSMatrix', QuestionText: 'Côte à côte' }),
      sq({ QuestionID: 'QID8', DataExportTag: 'avis', QuestionType: 'TE', Selector: 'ML', QuestionText: 'Votre avis' }),
      sq({ QuestionID: 'QID9', DataExportTag: 'jete', QuestionType: 'TE', Selector: 'SL', QuestionText: 'Jetée' }),
    ],
  }
}

describe('cas particuliers', () => {
  const lu = lireFichierImport(Buffer.from(JSON.stringify(qsf())))
  const { dump } = lu

  it('reconnaît un .qsf (et pas une structure MindCraft)', () => {
    expect(estQualtrics(JSON.stringify(qsf()))).toBe(true)
    expect(estQualtrics(JSON.stringify({ mindcraft: { blocks: [] } }))).toBe(false)
  })

  it('valeurs recodées, réponse obligatoire, NPS, curseurs, classement, texte long', () => {
    expect(parCode(dump, 'accord')).toMatchObject({ type: 'RADIO', required: true })
    expect(parCode(dump, 'accord').choices.map((c) => c.code)).toEqual(['1', '0', '9'])
    expect(parCode(dump, 'nps')).toMatchObject({ type: 'LIKERT', settings: { points: 11, startFrom: 0 } })
    expect(parCode(dump, 'curseur_1')).toMatchObject({ type: 'SLIDER', settings: { min: 0, max: 10 } })
    expect(parCode(dump, 'curseur_2').type).toBe('SLIDER')
    expect(parCode(dump, 'classe').choices).toHaveLength(2)
    expect(parCode(dump, 'avis')).toMatchObject({ type: 'TEXT', settings: { multiline: true } })
  })

  it('sauts de page en début et en fin de bloc ignorés ; corbeille ignorée', () => {
    expect(dump.mindcraft.blocks[0].questions.map((q) => q.type)).toEqual(['RADIO', 'LIKERT'])
    expect(parCode(dump, 'jete')).toBeUndefined()
  })

  it('tirage d\'un bloc → facteur inter-sujets ; tirage de tous → ordre aléatoire', () => {
    const f = dump.mindcraft.design.factors[0]
    expect(f).toMatchObject({ type: 'BETWEEN', levels: [{ code: 'C1', name: 'Texte A' }, { code: 'C2', name: 'Texte B' }] })
    const blocs = dump.mindcraft.blocks
    expect(f.levels.map((l) => blocs.find((b) => b.id === l.blockIds[0]).label)).toEqual(['Texte A', 'Texte B'])
    const ordre = blocs.filter((b) => b.settings.randomGroup)
    expect(ordre.map((b) => b.label)).toEqual(['Ordre 1', 'Ordre 2'])
    expect(blocs.find((b) => b.label === 'Ordre 2').settings.randomizeOrder).toBe(true)
  })

  it('branchement vers des blocs → condition sur leurs questions', () => {
    expect(parCode(dump, 'avis').settings.displayCondition).toEqual({ sourceCode: 'accord', operator: 'EQUALS', value: '1' })
  })

  it('reprise de réponse convertie ; le reste signalé', () => {
    expect(parCode(dump, 'txtA').text).toContain('${accord}')
    const texte = lu.avertissements.join(' ')
    expect(texte).toContain('tableau côte à côte (SBS/SBSMatrix) : sbs')
    expect(texte).toContain('« Autre, précisez »')
    expect(texte).toContain('données intégrées (Embedded Data)')
    expect(texte).toMatch(/1 insertion Qualtrics/)
  })

  it('s\'importe : les blocs des conditions suivent les nouveaux identifiants', () => {
    const { erreurs, donnees: d } = preparerImport(dump)
    expect(erreurs).toEqual([])
    const nom = (id) => d.blocs.find((b) => b.id === id)?.label
    expect(d.plan.niveaux.map((l) => nom(l.blockIds[0]))).toEqual(['Texte A', 'Texte B'])
  })

  it('refuse un .qsf illisible', () => {
    expect(() => lireFichierImport(Buffer.from('{"SurveyEntry": {}, "SurveyElements": []}'))).toThrow(/sans contenu/)
  })
})
