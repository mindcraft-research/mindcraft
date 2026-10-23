// SPDX-License-Identifier: AGPL-3.0-or-later
// Règles « condition expérimentale » des blocs-logiques (lib/logicRules.js) :
// à la copie d'une étude ou d'un bloc, rules[].levelId doit pointer sur les
// niveaux de la copie, pas sur ceux de l'étude d'origine.

import { describe, it, expect } from 'vitest'
import { remapperNiveauxRegles, correspondanceNiveaux } from '../src/lib/logicRules.js'

const reglages = () => ({
  name: 'Aiguillage',
  defaultTargetBlockId: 'bFin',
  rules: [
    { type: 'CONDITION_ASSIGNMENT', operator: 'EQUALS', levelId: 'nMenace', action: 'GOTO_BLOCK', targetBlockId: 'bA' },
    { type: 'CONDITION_ASSIGNMENT', operator: 'NOT_EQUALS', levelId: 'nSupprime', action: 'GOTO_BLOCK', targetBlockId: 'bB' },
    { type: 'CONDITION_ASSIGNMENT', operator: 'EQUALS', levelId: '', action: 'END_STUDY' },
    { type: 'RESPONSE_VALUE', sourceQuestionCode: 'age', operator: 'EQUALS', value: '18', levelId: 'nMenace' },
  ],
})

describe('remapperNiveauxRegles', () => {
  it('réécrit levelId et vide ceux sans correspondance', () => {
    const { settings, perdues } = remapperNiveauxRegles(reglages(), new Map([['nMenace', 'nouveau1']]))
    expect(settings.rules[0].levelId).toBe('nouveau1')
    expect(settings.rules[1].levelId).toBeNull()
    expect(perdues).toBe(1)
  })

  it('ne touche ni aux règles sans niveau, ni aux autres types, ni au reste des réglages', () => {
    const { settings } = remapperNiveauxRegles(reglages(), new Map([['nMenace', 'nouveau1']]))
    expect(settings.rules[2].levelId).toBe('')
    expect(settings.rules[3].levelId).toBe('nMenace')
    expect(settings.rules[0].targetBlockId).toBe('bA')
    expect(settings.name).toBe('Aiguillage')
    expect(settings.defaultTargetBlockId).toBe('bFin')
  })

  it('ne modifie pas les réglages d\'origine', () => {
    const s = reglages()
    remapperNiveauxRegles(s, new Map([['nMenace', 'nouveau1']]))
    expect(s.rules[0].levelId).toBe('nMenace')
  })

  it('accepte des réglages sans règles', () => {
    expect(remapperNiveauxRegles(null, new Map())).toEqual({ settings: null, perdues: 0 })
    expect(remapperNiveauxRegles({ name: 'x' }, new Map())).toEqual({ settings: { name: 'x' }, perdues: 0 })
  })
})

describe('correspondanceNiveaux', () => {
  const source = [
    { name: 'Menace', levels: [{ id: 's1', code: 'MENACE' }, { id: 's2', code: 'CTRL' }] },
    { name: 'Ordre', levels: [{ id: 's3', code: 'A' }] },
  ]

  it('associe par nom de facteur + code de niveau (casse et espaces ignorés)', () => {
    const cible = [{ name: ' menace ', levels: [{ id: 'c1', code: 'menace' }, { id: 'c2', code: 'AUTRE' }] }]
    const m = correspondanceNiveaux(source, cible)
    expect(m.get('s1')).toBe('c1')
    expect(m.has('s2')).toBe(false)
    expect(m.has('s3')).toBe(false)
  })

  it('renvoie une table vide sans plan cible', () => {
    expect(correspondanceNiveaux(source, undefined).size).toBe(0)
    expect(correspondanceNiveaux(undefined, source).size).toBe(0)
  })

  it('ignore les codes vides', () => {
    const m = correspondanceNiveaux(
      [{ name: 'F', levels: [{ id: 's1', code: '' }] }],
      [{ name: 'F', levels: [{ id: 'c1', code: '' }] }],
    )
    expect(m.size).toBe(0)
  })
})
