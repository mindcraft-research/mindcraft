// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du regroupement des corrections du cahier de laboratoire
// (frontend/src/lib/cahier.js), testé ici faute de suite côté frontend.

import { describe, it, expect } from 'vitest'
import { grouperEntrees, blocCorrespond } from '../../frontend/src/lib/cahier.js'
import { grouperEntrees as grouperPourPdf } from '../src/lib/notebook.js'

const e = (id, kind = 'NOTE', correctsId = null) => ({ id, kind, correctsId })

describe('grouperEntrees', () => {
  it('garde les entrées sans correction dans l’ordre chronologique', () => {
    const blocs = grouperEntrees([e('a'), e('b')])
    expect(blocs.map((b) => b.entree.id)).toEqual(['a', 'b'])
    expect(blocs.every((b) => b.suites.length === 0)).toBe(true)
  })

  it('place une correction dans le bloc de l’entrée d’origine, même écrite plus tard', () => {
    const blocs = grouperEntrees([e('a'), e('b'), e('c', 'NOTE', 'a')])
    expect(blocs.map((b) => b.entree.id)).toEqual(['a', 'b'])
    expect(blocs[0].suites.map((s) => s.id)).toEqual(['c'])
  })

  it('range plusieurs corrections de la plus ancienne à la plus récente', () => {
    const blocs = grouperEntrees([e('a'), e('c1', 'NOTE', 'a'), e('c2', 'NOTE', 'a')])
    expect(blocs[0].suites.map((s) => s.id)).toEqual(['c1', 'c2'])
  })

  it('garde une correction de correction dans le bloc d’origine', () => {
    const blocs = grouperEntrees([e('a'), e('c1', 'NOTE', 'a'), e('c2', 'NOTE', 'c1')])
    expect(blocs).toHaveLength(1)
    expect(blocs[0].suites.map((s) => s.id)).toEqual(['c1', 'c2'])
  })

  it('fait un bloc à part si l’entrée citée est introuvable', () => {
    const blocs = grouperEntrees([e('c', 'NOTE', 'disparue')])
    expect(blocs.map((b) => b.entree.id)).toEqual(['c'])
  })

  it('ne boucle pas sur des citations circulaires', () => {
    const blocs = grouperEntrees([e('a', 'NOTE', 'b'), e('b', 'NOTE', 'a')])
    expect(blocs.flatMap((b) => [b.entree.id, ...b.suites.map((s) => s.id)]).sort()).toEqual(['a', 'b'])
  })

  it('n’oublie aucune entrée', () => {
    const entrees = [e('a'), e('b', 'AUTO'), e('c', 'NOTE', 'b'), e('d', 'INCIDENT', 'a'), e('f', 'NOTE', 'd')]
    const ids = grouperEntrees(entrees).flatMap((b) => [b.entree.id, ...b.suites.map((s) => s.id)])
    expect(ids.sort()).toEqual(['a', 'b', 'c', 'd', 'f'])
  })
})

describe('grouperEntrees du PDF (serveur)', () => {
  it('range les entrées comme à l’écran', () => {
    const entrees = [e('a'), e('b', 'AUTO'), e('c', 'NOTE', 'b'), e('d', 'INCIDENT', 'a'), e('f', 'NOTE', 'd'), e('g', 'NOTE', 'disparue')]
    expect(grouperPourPdf(entrees)).toEqual(grouperEntrees(entrees))
  })
})

describe('blocCorrespond', () => {
  const bloc = { entree: e('a', 'PASSATION'), suites: [e('c', 'INCIDENT', 'a')] }

  it('montre tout avec le filtre « Toutes »', () => {
    expect(blocCorrespond(bloc, 'TOUS')).toBe(true)
  })

  it('retient le type de l’entrée et celui de ses corrections', () => {
    expect(blocCorrespond(bloc, 'PASSATION')).toBe(true)
    expect(blocCorrespond(bloc, 'INCIDENT')).toBe(true)
    expect(blocCorrespond(bloc, 'NOTE')).toBe(false)
  })
})
