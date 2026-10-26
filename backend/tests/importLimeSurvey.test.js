// SPDX-License-Identifier: AGPL-3.0-or-later
// Conversion LimeSurvey (.lss) → structure MindCraft (lib/importLimeSurvey.js).
// Jeux d'essai : extraits de questionnaires de démonstration LimeSurvey
// (tests/fixtures/limesurvey, GPL v2+), format 2.05 et format 7.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { convertirCondition, estLimeSurvey } from '../src/lib/importLimeSurvey.js'
import { lireFichierImport, preparerImport } from '../src/lib/importStructure.js'
import { referencesManquantes } from '../src/lib/structure.js'
import { creerZip } from '../src/lib/zip.js'

const fixture = (nom) => readFileSync(new URL(`./fixtures/limesurvey/${nom}`, import.meta.url))
const questions = (dump) => dump.mindcraft.blocks.flatMap((b) => b.questions)
const parCode = (dump, code) => questions(dump).find((q) => q.code === code)

describe('LimeSurvey 2.05 (textes dans les tables, une ligne par langue)', () => {
  const lu = lireFichierImport(fixture('ls205_extrait.lss'))
  const { dump } = lu

  it('reconnaît le fichier et garde le titre, l\'accueil et la fin', () => {
    expect(lu.source).toBe('LimeSurvey')
    expect(dump.mindcraft.export.generatedBy).toBe('LimeSurvey (conversion, base 177)')
    expect(dump.mindcraft.study.name).toBe('Sample LimeSurvey for 1.92+')
    const types = dump.mindcraft.blocks.map((b) => b.type)
    expect(types[0]).toBe('WELCOME')
    expect(types.at(-1)).toBe('DEBRIEFING')
    expect(types.filter((t) => t === 'QUESTION')).toHaveLength(4)
  })

  it('convertit chaque type en gardant les codes LimeSurvey', () => {
    expect(parCode(dump, 'married')).toMatchObject({ type: 'RADIO', choices: [{ code: 'Y' }, { code: 'N' }] })
    expect(parCode(dump, 'qGender').choices.map((c) => c.code)).toEqual(['F', 'M'])
    expect(parCode(dump, 'qListDropdown').type).toBe('SELECT')
    expect(parCode(dump, 'qMultipleChoice')).toMatchObject({ type: 'CHECKBOX' })
    expect(parCode(dump, 'qMultipleChoice').choices.map((c) => c.code)).toEqual(['Hawaii', 'Bahamas', 'Europe', 'NewZealand'])
    expect(parCode(dump, 'qArray')).toMatchObject({ type: 'MATRIX', settings: { columns: 5, columnLabels: ['Hate', 'Dislike', 'Ambivalent', 'Like', 'Love'] } })
    expect(parCode(dump, 'qArray').matrixItems.map((i) => i.code)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5'])
    expect(parCode(dump, 'qLongText')).toMatchObject({ type: 'TEXT', settings: { multiline: true } })
    expect(parCode(dump, 'qDate')).toMatchObject({ type: 'DATE', settings: { format: 'date' } })
    expect(parCode(dump, 'qRanking').choices).toHaveLength(4)
    expect(parCode(dump, 'kid1').required).toBe(true)
  })

  it('« Autre » ajouté en dernier choix ; textes courts multiples et double échelle éclatés', () => {
    const autre = parCode(dump, 'qListRadio').choices.at(-1)
    expect(autre).toMatchObject({ code: '-oth-', anchored: true })
    expect(['qMultipleShort_friend', 'qMultipleShort_family', 'qMultipleShort_work'].every((c) => parCode(dump, c)?.type === 'TEXT')).toBe(true)
    expect(parCode(dump, 'qArrayDualScale_1').settings.columnLabels[0]).toBe('Mild Severity')
    expect(parCode(dump, 'qArrayDualScale_2').settings.columnLabels[0]).toBe('Mild Bothersomeness')
  })

  it('ignore ce qui n\'a pas d\'équivalent, et le signale', () => {
    expect(parCode(dump, 'hidden1')).toBeUndefined()
    expect(parCode(dump, 'qArrayNumbers')).toBeUndefined()
    const texte = lu.avertissements.join(' ')
    expect(texte).toContain('question masquée : hidden1')
    expect(texte).toContain('tableau de nombres : qArrayNumbers')
    expect(texte).toContain('ageltym')
    expect(texte).toMatch(/Tableaux \(qArray, qArrayDualScale\) : MindCraft enregistre le numéro de la colonne/)
  })

  it('conditions : celle du groupe s\'ajoute à celle de la question', () => {
    expect(parCode(dump, 'name').settings.displayCondition).toEqual({ sourceCode: 'num', operator: 'GREATER_THAN', value: '10' })
    expect(parCode(dump, 'married').settings.displayCondition).toEqual({ combinator: 'AND', conditions: [
      { sourceCode: 'num', operator: 'GREATER_THAN', value: '10' },
      { sourceCode: 'age', operator: 'GREATER_THAN', value: '5' },
    ] })
  })

  it('s\'importe sans erreur ni lien cassé', () => {
    expect(referencesManquantes(dump)).toEqual([])
    const p = preparerImport(dump)
    expect(p.erreurs).toEqual([])
    expect(p.resume.questions).toBe(questions(dump).length)
  })
})

describe('LimeSurvey 7 (tables *_l10ns, deux langues)', () => {
  const lu = lireFichierImport(fixture('ls7_extrait.lss'))
  const { dump } = lu

  it('textes dans la langue de base, l\'autre langue en traductions', () => {
    expect(parCode(dump, 'G00Q03').choices.map((c) => c.label)).toEqual(['OPTION A', 'OPTION B', 'OPTION C', 'OPTION D'])
    const i18n = dump.mindcraft.study.metadata.i18n
    expect(i18n).toMatchObject({ defaultLang: 'en', languages: ['de'] })
    const q = parCode(dump, 'G00Q03')
    expect(i18n.translations.de[`q:${q.id}:c:${q.choices[0].id}`]).toBe('OPTION A de')
    expect(i18n.translations.de['b:ls-accueil:title']).toBe('LS7 - Beispielumfrage')
  })

  it('classement : éléments repris des sous-questions (LimeSurvey ≥ 6)', () => {
    expect(parCode(dump, 'G05Q33').choices.map((c) => c.code)).toEqual(['SQ001', 'SQ002', 'SQ003', 'SQ004'])
  })

  it('les traductions suivent les nouveaux identifiants à l\'import', () => {
    expect(referencesManquantes(dump)).toEqual([])
    const { donnees: d } = preparerImport(dump)
    const q = d.questions.find((x) => x.code === 'G00Q03')
    const c = d.choix.find((x) => x.questionId === q.id && x.code === 'AO01')
    expect(d.etude.metadata.i18n.translations.de[`q:${q.id}:c:${c.id}`]).toBe('OPTION A de')
    expect(Object.keys(d.etude.metadata.i18n.translations.de).length).toBe(Object.keys(dump.mindcraft.study.metadata.i18n.translations.de).length)
  })

  it('équation non reprise, signalée', () => {
    expect(parCode(dump, 'BMI')).toBeUndefined()
    expect(lu.avertissements.join(' ')).toContain('équation : BMI')
  })

  it('un groupe dont aucune question n\'est reprise ne devient pas un bloc vide', () => {
    // Groupe « Equation » : BMI (équation) + tall. On masque tall → plus rien.
    let xml = fixture('ls7_extrait.lss').toString()
    const qid = /<row>\s*<qid><!\[CDATA\[(\d+)\]\]><\/qid>(?:(?!<\/row>)[\s\S])*?<title><!\[CDATA\[tall\]\]><\/title>/.exec(xml)[1]
    // En fin de table : la dernière valeur d'un attribut l'emporte (tall a déjà « hidden = 0 »).
    xml = xml.replace(/(<question_attributes>[\s\S]*?)(\s*<\/rows>\s*<\/question_attributes>)/, `$1\n   <row><qid><![CDATA[${qid}]]></qid><attribute><![CDATA[hidden]]></attribute><value><![CDATA[1]]></value><language><![CDATA[]]></language></row>$2`)
    const sans = lireFichierImport(Buffer.from(xml)).dump.mindcraft.blocks
    expect(sans.filter((b) => b.type === 'QUESTION' && b.questions.length === 0)).toEqual([])
    expect(sans.map((b) => b.label)).not.toContain('Equation')
    expect(dump.mindcraft.blocks.map((b) => b.label)).toContain('Equation')
  })
})

describe('convertirCondition', () => {
  const variables = new Map([
    ['age', { code: 'age' }], ['nom', { code: 'nom' }], ['statut', { code: 'statut' }],
    ['loisirs_sport', { code: 'loisirs', sous: 'sport' }],
  ])
  const c = (e) => convertirCondition(e, variables)

  it('toujours vrai → pas de condition', () => {
    expect(c('1')).toBeNull()
    expect(c('')).toBeNull()
  })
  it('comparaisons simples, avec ou sans .NAOK et parenthèses', () => {
    expect(c('age > 5')).toEqual({ sourceCode: 'age', operator: 'GREATER_THAN', value: '5' })
    expect(c('(statut.NAOK == "A2")')).toEqual({ sourceCode: 'statut', operator: 'EQUALS', value: 'A2' })
    expect(c("statut ne 'A1'")).toEqual({ sourceCode: 'statut', operator: 'NOT_EQUALS', value: 'A1' })
    expect(c('!is_empty(nom)')).toEqual({ sourceCode: 'nom', operator: 'IS_NOT_EMPTY', value: '' })
  })
  it('ET / OU, et « ≥ » réécrit en « > ou = »', () => {
    expect(c('age > 5 and statut == "A1"')).toEqual({ combinator: 'AND', conditions: [
      { sourceCode: 'age', operator: 'GREATER_THAN', value: '5' }, { sourceCode: 'statut', operator: 'EQUALS', value: 'A1' },
    ] })
    expect(c('age >= 18')).toEqual({ combinator: 'OR', conditions: [
      { sourceCode: 'age', operator: 'GREATER_THAN', value: '18' }, { sourceCode: 'age', operator: 'EQUALS', value: '18' },
    ] })
  })
  it('case d\'un choix multiple → contient / ne contient pas', () => {
    expect(c('loisirs_sport == "Y"')).toEqual({ sourceCode: 'loisirs', operator: 'CONTAINS', value: 'sport' })
    expect(c('loisirs_sport != "Y"')).toEqual({ sourceCode: 'loisirs', operator: 'NOT_CONTAINS', value: 'sport' })
  })
  it('non convertible → undefined', () => {
    expect(c('is_empty(nom)')).toBeUndefined()
    expect(c('age > 5 and statut == "A1" or nom == "x"')).toBeUndefined()
    expect(c('age >= 18 and statut == "A1"')).toBeUndefined()
    expect(c('age > statut')).toBeUndefined()
    expect(c('inconnue == "1"')).toBeUndefined()
    expect(c('sum(age, 2) > 3')).toBeUndefined()
  })
})

describe('lecture des fichiers LimeSurvey', () => {
  it('archive .lsa : seul le questionnaire est lu, jamais les réponses', () => {
    const lsa = creerZip([
      { nom: 'survey_archive_123.lss', contenu: fixture('ls7_extrait.lss') },
      { nom: 'survey_archive_123.lsr', contenu: '<document><responses>secret</responses></document>' },
    ])
    const lu = lireFichierImport(lsa)
    expect(lu.source).toBe('LimeSurvey')
    expect(lu.zip).toBeNull()
    expect(JSON.stringify(lu.dump)).not.toContain('secret')
  })

  it('refuse un export LimeSurvey qui n\'est pas un questionnaire complet', () => {
    const groupe = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n <LimeSurveyDocType>Group</LimeSurveyDocType>\n</document>'
    expect(estLimeSurvey(groupe)).toBe(true)
    expect(() => lireFichierImport(Buffer.from(groupe))).toThrow(/type « Group »/)
  })

  it('{code} devient ${code} dans les textes', () => {
    const lu = lireFichierImport(fixture('ls205_extrait.lss'))
    const textes = JSON.stringify(lu.dump)
    expect(textes).toContain('${num}')
  })
})
