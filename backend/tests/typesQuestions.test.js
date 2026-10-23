// SPDX-License-Identifier: AGPL-3.0-or-later
// Chaque type de question proposé dans l'éditeur doit exister dans le schéma
// de la base (enum QuestionType). Sans ça, l'ajout échoue (erreur 500) : c'est
// arrivé au saut de page (PAGE_BREAK, #164), ajouté côté site seulement.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import prisma from '@prisma/client'

describe('types de questions', () => {
  it('tous les types de l\'éditeur existent dans la base', () => {
    const source = readFileSync(new URL('../../frontend/src/components/builder/BlockInspector.jsx', import.meta.url), 'utf8')
    const debut = source.indexOf('const QUESTION_GROUPS = [')
    const fin = source.indexOf('const QUESTION_TYPES = ', debut)
    expect(debut).toBeGreaterThan(-1)
    const typesEditeur = [...source.slice(debut, fin).matchAll(/value:\s*'([A-Z_]+)'/g)].map((m) => m[1])
    expect(typesEditeur.length).toBeGreaterThan(30)
    const typesBase = Object.keys(prisma.QuestionType)
    expect(typesEditeur.filter((t) => !typesBase.includes(t))).toEqual([])
  })
})
