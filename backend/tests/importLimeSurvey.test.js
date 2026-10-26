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

describe('images (archive .zip : .lss + images)', () => {
  // L'extrait 2.05, avec des images comme en ont les questionnaires réels.
  const xml = fixture('ls205_extrait.lss').toString()
    .replace('<![CDATA[<p>This is just a text display.', '<![CDATA[<p>Avant l\'image.</p><img src="/upload/surveys/1/images/Pyramide%20des%20salaires.png" alt="Pyramide"><p>Après l\'image.</p><p>This is just a text display.')
    .replace('<![CDATA[How old are you?]]>', '<![CDATA[<img src="https://ls.univ.fr/upload/surveys/1/images/age.jpg">How old are you?]]>')
    .replace('<answer><![CDATA[Red]]></answer>', '<answer><![CDATA[/upload/surveys/1/images/rouge.png]]></answer>')
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
  const archive = creerZip([
    { nom: 'questionnaire.lss', contenu: xml },
    { nom: 'images/pyramide des salaires.png', contenu: png },
    { nom: 'images/age.jpg', contenu: png },
    { nom: 'images/rouge.png', contenu: png },
    { nom: 'files/notice.pdf', contenu: 'pdf' },
  ])

  it('texte affiché découpé dans l\'ordre : texte, image, texte', () => {
    const lu = lireFichierImport(archive)
    const qs = questions(lu.dump)
    const i = qs.findIndex((q) => q.code === 'qTextDisplay')
    expect(qs.slice(i, i + 3).map((q) => q.type)).toEqual(['DISPLAY', 'IMAGE', 'DISPLAY'])
    expect(qs[i].text).toContain('Avant l\'image.')
    expect(qs[i + 1].settings).toMatchObject({ url: '/api/media/files/ls3-pyramide_des_salaires.png', alt: 'Pyramide' })
    expect(qs[i + 2].text).toContain('Après l\'image.')
    // Numérotées dans l'ordre du questionnaire ; les autres fichiers (pdf) ignorés.
    expect([...lu.zip.keys()]).toEqual(['medias/ls1-age.jpg', 'medias/ls2-rouge.png', 'medias/ls3-pyramide_des_salaires.png'])
  })

  it('image d\'un énoncé : question « Image » juste avant, avec la même condition', () => {
    const qs = questions(lireFichierImport(archive).dump)
    const i = qs.findIndex((q) => q.code === 'age')
    expect(qs[i - 1]).toMatchObject({ type: 'IMAGE', settings: { url: '/api/media/files/ls1-age.jpg' } })
    expect(qs[i - 1].settings.displayCondition).toEqual(qs[i].settings.displayCondition)
    expect(qs[i].text).toBe('How old are you?')
  })

  it('réponse-image → choix avec image', () => {
    const q = parCode(lireFichierImport(archive).dump, 'qListRadio')
    expect(q.type).toBe('MEDIA_RADIO')
    expect(q.choices[0]).toMatchObject({ code: '1', mediaUrl: '/api/media/files/ls2-rouge.png', mediaType: 'image', label: '' })
    expect(q.choices[1]).toMatchObject({ code: '2', label: 'Orange' })
  })

  it('à l\'import, les images deviennent des médias de l\'étude', () => {
    const lu = lireFichierImport(archive)
    let n = 0
    const p = preparerImport(lu.dump, { zip: lu.zip, nomFichier: (ext) => `nouveau${++n}${ext}` })
    expect(p.erreurs).toEqual([])
    expect(p.resume.medias).toEqual({ zip: 3, instance: 0, absents: 0 })
    expect(p.donnees.medias.map((m) => m.mimetype)).toEqual(['image/jpeg', 'image/png', 'image/png'])
    expect(p.donnees.questions.filter((q) => q.type === 'IMAGE').map((q) => q.settings.url)).toEqual(['/api/media/files/nouveau1.jpg', '/api/media/files/nouveau3.png'])
  })

  it('sans les images : textes gardés, images signalées', () => {
    const lu = lireFichierImport(Buffer.from(xml))
    expect(lu.zip).toBeNull()
    const qs = questions(lu.dump)
    expect(qs.filter((q) => q.type === 'IMAGE')).toEqual([])
    const i = qs.findIndex((q) => q.code === 'qTextDisplay')
    expect(qs.slice(i, i + 2).map((q) => q.text.includes('Avant') || q.text.includes('Après'))).toEqual([true, true])
    expect(lu.avertissements.join(' ')).toMatch(/3 images restées sur LimeSurvey \(age\.jpg, rouge\.png, pyramide des salaires\.png\)/)
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
