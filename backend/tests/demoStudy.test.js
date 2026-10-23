// SPDX-License-Identifier: AGPL-3.0-or-later
// Étude de démonstration (lib/createDemoStudy.js) : le modèle ne doit pas
// apporter de références vers l'étude d'où il a été exporté — en particulier
// settings._questionOrder, qui listait des IDs de questions d'une autre étude.
// L'ordre d'affichage voulu est porté par le champ `order` des questions.
// Test d'intégration : base de test (pas besoin du serveur).

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import template from '../src/lib/demoStudyTemplate.json'
import { createDemoStudy } from '../src/lib/createDemoStudy.js'
import { structureEtude, referencesManquantes } from '../src/lib/structure.js'

const prisma = new PrismaClient()
const NOM = `demo${Date.now()}`
let user

describe('Étude de démonstration', () => {
  beforeAll(async () => {
    user = await prisma.user.create({ data: { username: NOM, email: `${NOM}@test.com`, password: 'x', emailVerified: true } })
  })
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: NOM } })
    await prisma.$disconnect()
  })

  it('le modèle ne contient pas de _questionOrder, et les `order` de chaque bloc sont 0..n-1', () => {
    for (const b of template.blocks) {
      expect(b.settings || {}).not.toHaveProperty('_questionOrder')
      const ordres = (b.questions || []).map((q) => q.order).sort((x, y) => x - y)
      expect(ordres).toEqual(ordres.map((_, i) => i))
    }
  })

  it('l’ordre voulu des blocs « choix unique » et « spéciales » est respecté', () => {
    const codes = (nom) => template.blocks.find((b) => b.settings?.name === nom)
      .questions.slice().sort((a, b) => a.order - b.order).map((q) => q.code)
    expect(codes('Bloc questions "choix unique"')).toEqual(['ChoixUnique1', 'ChoixUnique2', 'ChoixUnique3', 'ChoixUnique4', 'ChoixUnique5', 'ChoixUnique6'])
    expect(codes('Bloc questions "spéciales"')).toEqual(['Special1', 'Special2', 'Special3', 'Special4', 'Special5', 'Special6', 'Special7', 'Special8', 'Special9', 'Special10'])
  })

  it('l’étude créée n’a aucune référence interne manquante', async () => {
    const { study } = await createDemoStudy(prisma, user.id)
    const complete = await prisma.study.findUnique({
      where: { id: study.id },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: {
            questions: { orderBy: { order: 'asc' }, include: { choices: true, matrixItems: true } },
            sequenceSteps: true,
            stimulusFiles: true,
          },
        },
        design: { include: { factors: { include: { levels: true } } } },
      },
    })
    for (const b of complete.blocks) expect(b.settings || {}).not.toHaveProperty('_questionOrder')
    expect(referencesManquantes(structureEtude(complete))).toEqual([])
  })
})
