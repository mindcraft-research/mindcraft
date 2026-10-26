// SPDX-License-Identifier: AGPL-3.0-or-later
// Reprise d'éléments par un Classement / une Matrice : construction des
// éléments à la passation (frontend/src/lib/reprise.js) et colonnes d'export
// (backend/src/lib/reprise.js).

import { describe, it, expect } from 'vitest'
import { elementsRepris } from '../../frontend/src/lib/reprise.js'
import { sourcesFermees, sourceFermeeDe, colonnesFermees, celluleRangFerme, texteCodebookFerme } from '../src/lib/reprise.js'

const choix = (codes) => codes.map((c) => ({ code: c, label: `Mot ${c}` }))
const evoc = { code: 'evoc', type: 'WORD_LIST', settings: {}, choices: [] }
const loisirs = { code: 'loisirs', type: 'CHECKBOX', settings: {}, choices: choix(['sport', 'lecture', 'cinema']) }
const tri = { code: 'tri', type: 'DRAG_DROP', settings: { zones: [{ code: 'A', label: 'Catégorie A' }, { code: 'B', label: 'Catégorie B' }] }, choices: choix(['m1', 'm2', 'm3', 'm4']) }
const parCode = { evoc, loisirs, tri }
const classement = (itemsSource) => ({ code: 'rang', type: 'RANKING', settings: { itemsSource }, choices: [] })

describe('éléments repris à la passation', () => {
  it('Liste de mots : inchangé (codes w1, w2…)', () => {
    const q = elementsRepris(classement({ fromCode: 'evoc' }), { evoc: ['chat', '', 'chien'] }, parCode)
    expect(q.choices).toEqual([{ id: 'w1', code: 'w1', label: 'chat' }, { id: 'w2', code: 'w2', label: 'chien' }])
    // Sans la liste des questions (ancien appel) : même résultat.
    expect(elementsRepris(classement({ fromCode: 'evoc' }), { evoc: ['chat'] }).choices).toEqual([{ id: 'w1', code: 'w1', label: 'chat' }])
  })

  it('cases à cocher : les choix cochés, dans l\'ordre de la question, avec leur code', () => {
    const q = elementsRepris(classement({ fromCode: 'loisirs' }), { loisirs: ['cinema', 'sport'] }, parCode)
    expect(q.choices).toEqual([{ id: 'sport', code: 'sport', label: 'Mot sport' }, { id: 'cinema', code: 'cinema', label: 'Mot cinema' }])
  })

  it('choix multiple + commentaire : les choix cochés', () => {
    const src = { ...loisirs, code: 'lc', type: 'CHECKBOX_COMMENT' }
    const q = elementsRepris(classement({ fromCode: 'lc' }), { lc: { choices: ['lecture'], comment: 'x' } }, { lc: src })
    expect(q.choices.map((c) => c.code)).toEqual(['lecture'])
  })

  it('glisser-déposer : seulement la catégorie choisie, dans l\'ordre de dépôt', () => {
    const rep = { tri: { A: ['m3', 'm1'], B: ['m2'] } }
    expect(elementsRepris(classement({ fromCode: 'tri', zone: 'A' }), rep, parCode).choices.map((c) => c.code)).toEqual(['m3', 'm1'])
    expect(elementsRepris(classement({ fromCode: 'tri', zone: 'B' }), rep, parCode).choices.map((c) => c.label)).toEqual(['Mot m2'])
    // Catégorie vide, pas de réponse, code inconnu : aucun élément.
    expect(elementsRepris(classement({ fromCode: 'tri', zone: 'A' }), { tri: { B: ['m2'] } }, parCode).choices).toEqual([])
    expect(elementsRepris(classement({ fromCode: 'tri', zone: 'A' }), {}, parCode).choices).toEqual([])
    expect(elementsRepris(classement({ fromCode: 'tri', zone: 'A' }), { tri: { A: ['inconnu'] } }, parCode).choices).toEqual([])
  })

  it('matrice : les éléments deviennent les lignes', () => {
    const q = elementsRepris({ code: 'jug', type: 'MATRIX', settings: { itemsSource: { fromCode: 'tri', zone: 'B' } }, matrixItems: [] }, { tri: { B: ['m4'] } }, parCode)
    expect(q.matrixItems).toEqual([{ id: 'm4', code: 'm4', label: 'Mot m4' }])
  })

  it('sans reprise : question inchangée', () => {
    const q = { code: 'x', type: 'RANKING', settings: {}, choices: choix(['a']) }
    expect(elementsRepris(q, {}, parCode)).toBe(q)
  })
})

describe('colonnes d\'export (liste fermée)', () => {
  const study = { blocks: [
    { type: 'QUESTION', questions: [evoc, loisirs, tri, { ...tri, code: 'triReprise', settings: { ...tri.settings, itemsSource: { fromCode: 'evoc' } } }] },
  ] }
  const sources = sourcesFermees(study)

  it('sources fermées : cases à cocher et glisser-déposer, pas les listes de mots ni les sources reprises', () => {
    expect([...sources.keys()]).toEqual(['loisirs', 'tri'])
    expect(sourceFermeeDe(classement({ fromCode: 'evoc' }), sources)).toBeNull()
    expect(sourceFermeeDe(classement({ fromCode: 'triReprise' }), sources)).toBeNull()
    expect(sourceFermeeDe(classement({ fromCode: 'tri', zone: 'A' }), sources).type).toBe('DRAG_DROP')
  })

  it('classement : une colonne par rang possible, valeur = code de l\'élément', () => {
    const cols = colonnesFermees(classement({ fromCode: 'tri', zone: 'A' }), sources.get('tri'))
    expect(cols.map((c) => c.header)).toEqual(['rang1', 'rang2', 'rang3', 'rang4'])
    expect(celluleRangFerme(cols[0], ['m3', 'm1'])).toBe('m3')
    expect(celluleRangFerme(cols[2], ['m3', 'm1'])).toBe('')
  })

  it('matrice : une colonne par choix de la source, comme une matrice ordinaire', () => {
    const cols = colonnesFermees({ code: 'jug', type: 'MATRIX', settings: {} }, sources.get('loisirs'), { pfx: 'B2_' })
    expect(cols.map((c) => [c.header, c.itemCode])).toEqual([['B2_jug_sport', 'sport'], ['B2_jug_lecture', 'lecture'], ['B2_jug_cinema', 'cinema']])
  })

  it('codebook : explique la source et le format', () => {
    expect(texteCodebookFerme(classement({ fromCode: 'tri', zone: 'A' }), sources.get('tri'), 'A')).toContain('catégorie « Catégorie A » de « tri »')
    expect(texteCodebookFerme(classement({ fromCode: 'loisirs' }), sources.get('loisirs'))).toContain('choix cochés à « loisirs »')
  })
})
