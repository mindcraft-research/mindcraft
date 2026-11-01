// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la formule d'une question « calculée » (frontend/src/lib/formule.js),
// testée ici faute de suite côté frontend. Les formules valides doivent donner
// exactement le même résultat que l'ancienne évaluation (new Function), pour
// les études déjà en collecte.

import { describe, it, expect } from 'vitest'
import { calculerFormule, erreurFormule } from '../../frontend/src/lib/formule.js'

// Ancienne évaluation (ComputedQuestion.jsx avant ce changement).
function ancienne(formula, values) {
  try {
    const keys = Object.keys(values)
    // eslint-disable-next-line no-new-func
    const result = new Function(...keys, `return (${formula})`)(...keys.map((k) => values[k]))
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return null
    return result
  } catch {
    return null
  }
}

const FORMULES = [
  '(distance/temps)*60',
  'poids / (taille / 100) ** 2',
  'poids/(taille/100)**2',
  '(a + b + c) / 3',
  'a - b - c', 'a / b / c', 'a ** b ** 0.5', '2 ** 3 ** 2', 'a % b', '-a + +b', 'a * -b', 'a ** -1',
  '(-a) ** 2', '!a + 1', 'a - -b', '1e3 * a', '.5 * a', '1. + a', '3.14e-2 * b',
  'Math.sqrt(a)', 'Math.round(a * 100) / 100', 'Math.abs(a - b)', 'Math.min(a, b, c)', 'Math.max(a,b)',
  'Math.pow(a, 2) + Math.log(b)', 'Math.floor(a / b)', 'Math.PI * a ** 2', 'Math.E', 'Math . sqrt ( a )',
  'Math.hypot(a, b)', 'Math.max()', 'Math.min()',
  'a > b ? a : b', 'a >= 18 ? 1 : 0', 'a < b && b < c ? 1 : 2', 'a == b ? 1 : 0', 'a !== b ? a - b : 0',
  '(a > b) + (b > c)', 'a > 0 || b', 'a && b', 'a || b ? 1 : c ? 2 : 3', 'a ? b : c ? 1 : 2',
  'a / 0', 'Math.sqrt(-1)', 'a + true', 'a * Infinity', 'NaN',
  'âge * 2', 'score_total / nb_items',
  // invalides avant comme après
  '', 'a +', '(a', 'a b', '-a ** 2', 'inconnue * 2', 'Math.foo(a)', 'Math.random', '2a',
]

const JEUX = [
  { a: 3, b: 4, c: 5, distance: 12, temps: 30, poids: 70, taille: 175, 'âge': 30, score_total: 42, nb_items: 6 },
  { a: -2.5, b: 0, c: 1e-3, distance: 0, temps: 0, poids: 55.2, taille: 160, 'âge': 0, score_total: 0, nb_items: 0 },
  { a: 0, b: -7, c: 100, distance: 5.5, temps: 1, poids: 0, taille: 0, 'âge': 99, score_total: -3, nb_items: 2 },
]

describe('calculerFormule', () => {
  it('donne le même résultat que l’ancienne évaluation', () => {
    for (const f of FORMULES) {
      for (const v of JEUX) {
        expect(calculerFormule(f, v), `${f} avec ${JSON.stringify(v)}`).toBe(ancienne(f, v))
      }
    }
  })

  it('formule de l’étude de démonstration', () => {
    expect(calculerFormule('(distance/temps)*60', { distance: 10, temps: 40 })).toBe(15)
  })

  it('n’exécute jamais de code', () => {
    globalThis.__pirate = 0
    for (const f of [
      'globalThis.__pirate = 1',
      '(globalThis.__pirate = 1, 2)',
      'alert(1)',
      'fetch("https://exemple.org")',
      'this.constructor.constructor("globalThis.__pirate = 1")()',
      'Math.constructor.constructor("globalThis.__pirate = 1")()',
      'Math["sqrt"](4)',
      '"a" + 1',
      '`x`',
      'a.constructor',
      'eval("1")',
      'document.cookie',
      'localStorage.getItem("token")',
      'Math.max.call(null, 1)',
      'a = 3',
      '(() => 1)()',
      'new Date()',
    ]) {
      expect(calculerFormule(f, { a: 1 }), f).toBeNull()
    }
    expect(globalThis.__pirate).toBe(0)
    delete globalThis.__pirate
  })
})

describe('erreurFormule', () => {
  it('rien à signaler pour une formule correcte ou vide', () => {
    expect(erreurFormule('', [])).toBeNull()
    expect(erreurFormule('poids / (taille / 100) ** 2', ['poids', 'taille'])).toBeNull()
    expect(erreurFormule('Math.round(a) > 2 ? 1 : 0', ['a'])).toBeNull()
  })
  it('signale une formule illisible ou un code inconnu', () => {
    expect(erreurFormule('a +', ['a'])).toBeTruthy()
    expect(erreurFormule('alert(1)', ['a'])).toBeTruthy()
    expect(erreurFormule('poids / taile', ['poids', 'taille'])).toMatch(/taile/)
  })
})
