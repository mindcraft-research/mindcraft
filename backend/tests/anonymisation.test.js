// SPDX-License-Identifier: AGPL-3.0-or-later
// Anonymisation des réponses libres (lib/anonymisation.js) : détection des
// passages suspects, masquage dans les exports, validation des masques.
// Test unitaire : pas besoin du backend ni de la base.

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { detecter, textesDe, appliquerMasques, masquerReponses, masqueValide, suggestionsPour, variantesDe, resteASignaler } = require('../src/lib/anonymisation')

const passages = (t) => detecter(t).map((s) => [s.texte, s.categorie])

describe('detecter', () => {
  it('repère noms propres et organisations', () => {
    expect(passages('Mon chef Paul Durand m’a humilié devant l’équipe chez Leroy Merlin Rennes.'))
      .toEqual([['Paul Durand', 'NOM_PROPRE'], ['Leroy Merlin Rennes', 'NOM_PROPRE']])
  })
  it('repère e-mail, téléphone et date', () => {
    expect(passages('Écrivez-moi à julie.martin@gmail.com ou au 06 12 34 56 78, né le 12 mars 1998.'))
      .toEqual([['julie.martin@gmail.com', 'EMAIL'], ['06 12 34 56 78', 'TELEPHONE'], ['12 mars 1998', 'DATE']])
  })
  it('ignore la majuscule de début de phrase et les mots courants', () => {
    expect(passages('Je pense que oui. Bonjour à tous. Mardi dernier, rien.')).toEqual([])
  })
  it('garde un nom accentué en milieu de phrase', () => {
    expect(passages('Je suis allée voir Élodie hier.')).toEqual([['Élodie', 'NOM_PROPRE']])
  })
  it('texte vide ou non textuel', () => {
    expect(detecter('')).toEqual([])
    expect(detecter(null)).toEqual([])
  })
})

describe('textesDe', () => {
  it('lit toutes les formes de réponses libres, sans les codes de modalités', () => {
    expect(textesDe('bonjour')).toEqual(['bonjour'])
    expect(textesDe(['chien', '', 'chat'])).toEqual(['chien', 'chat'])
    expect(textesDe({ 0: 'un', 1: 'deux' })).toEqual(['un', 'deux'])
    expect(textesDe({ choice: 'A', comment: 'Paul' })).toEqual(['Paul'])
    expect(textesDe({ choices: ['A', 'B'], comment: 'Paul' })).toEqual(['Paul'])
  })
})

describe('appliquerMasques', () => {
  it('remplace toutes les occurrences, le plus long passage d’abord', () => {
    const masques = [{ texte: 'Paul', etiquette: '[NOM]' }, { texte: 'Paul Durand', etiquette: '[NOM]' }]
    expect(appliquerMasques('Paul Durand, encore Paul.', masques)).toBe('[NOM], encore [NOM].')
  })
  it('masque un mot composé en entier', () => {
    const masques = [{ texte: 'Marie', etiquette: '[NOM]' }]
    expect(appliquerMasques('Marie-Claire et Jean-Marie ont vu Marie.', masques)).toBe('[NOM] et [NOM] ont vu [NOM].')
  })
  it('ne retouche pas une étiquette déjà posée', () => {
    const masques = [{ texte: 'Paul', etiquette: '[NOM]' }, { texte: 'NOM', etiquette: '[MASQUÉ]' }]
    expect(appliquerMasques('Paul et NOM', masques)).toBe('[NOM] et [MASQUÉ]')
  })
  it('accepte des caractères spéciaux dans un passage', () => {
    expect(appliquerMasques('écrire à a.b+c@d.fr (vite)', [{ texte: 'a.b+c@d.fr', etiquette: '[EMAIL]' }])).toBe('écrire à [EMAIL] (vite)')
  })
  it('ne touche pas aux codes de modalités', () => {
    expect(appliquerMasques({ choice: 'A', comment: 'chez A' }, [{ texte: 'A', etiquette: '[X]' }]))
      .toEqual({ choice: 'A', comment: 'chez [X]' })
  })
  it('ne modifie pas la valeur d’origine', () => {
    const v = ['Paul']
    appliquerMasques(v, [{ texte: 'Paul', etiquette: '[NOM]' }])
    expect(v).toEqual(['Paul'])
  })
})

describe('masquerReponses', () => {
  it('applique les masques à la bonne réponse seulement', () => {
    const r = [{ id: 'r1', value: 'Paul' }, { id: 'r2', value: 'Paul' }]
    expect(masquerReponses(r, [{ responseId: 'r1', texte: 'Paul', etiquette: '[NOM]' }]).map((x) => x.value)).toEqual(['[NOM]', 'Paul'])
  })
})

describe('masqueValide', () => {
  it('exige un passage présent et une étiquette correcte', () => {
    expect(masqueValide('Paul Durand', { texte: 'Durand', etiquette: '[NOM]' })).toBe(true)
    expect(masqueValide('Paul Durand', { texte: 'Martin', etiquette: '[NOM]' })).toBe(false)
    expect(masqueValide('Paul Durand', { texte: 'Durand', etiquette: '<script>' })).toBe(false)
    expect(masqueValide('Paul Durand', { texte: 'Durand', etiquette: '[COLLÈGUE]' })).toBe(true)
  })
  it('refuse un masque vide ou mal formé sans lever d’erreur', () => {
    expect(masqueValide('Paul', null)).toBe(false)
    expect(masqueValide('Paul', undefined)).toBe(false)
    expect(masqueValide('Paul', 'Paul')).toBe(false)
  })
})

describe('variantesDe', () => {
  it('trouve les écritures de casse différente quand ce sont des mots entiers', () => {
    expect(variantesDe('Je vois paul durand et PAUL DURAND.', 'Paul Durand').sort()).toEqual(['PAUL DURAND', 'paul durand'])
  })
  it('garde le passage exact, même à l’intérieur d’un mot', () => {
    expect(variantesDe('pa-ulette', 'ulette')).toEqual(['ulette'])
  })
  it('ne prend pas une variante de casse à l’intérieur d’un mot', () => {
    expect(variantesDe('un journal', 'Al')).toEqual([])
  })
  it('passage absent ou invalide', () => {
    expect(variantesDe('Paul', 'Martin')).toEqual([])
    expect(variantesDe('Paul', undefined)).toEqual([])
  })
})

describe('resteASignaler', () => {
  const texte = 'Mon chef Paul Durand est là.'
  it('vrai tant qu’un passage signalé n’est pas masqué', () => {
    expect(resteASignaler(texte, [])).toBe(true)
    expect(resteASignaler(texte, [{ texte: 'Paul Durand', etiquette: '[NOM]' }])).toBe(false)
  })
  it('un mot composé couvert par son masque n’est plus signalé', () => {
    expect(resteASignaler('Hier Marie-Claire est venue.', [{ texte: 'Marie', etiquette: '[NOM]' }])).toBe(false)
  })
  it('un passage couvert en partie reste signalé', () => {
    expect(resteASignaler(texte, [{ texte: 'Paul', etiquette: '[NOM]' }])).toBe(true)
  })
})

describe('suggestionsPour', () => {
  it('dédoublonne les passages d’une réponse', () => {
    expect(suggestionsPour({ 0: 'Paul Durand vient.', 1: 'Avec Paul Durand.' }).map((s) => s.texte)).toEqual(['Paul Durand'])
  })
})
