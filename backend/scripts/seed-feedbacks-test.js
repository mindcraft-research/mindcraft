// SPDX-License-Identifier: AGPL-3.0-or-later
// Script local pour seed des feedbacks de test (uniquement pour dev local).
// Usage : node scripts/seed-feedbacks-test.js

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  console.log('Utilisateurs disponibles :')
  for (const u of users) console.log(`  - ${u.username} (${u.email}) [${u.role}]`)

  if (users.length === 0) {
    console.log('\nAucun utilisateur en DB. Crée un compte d\'abord.')
    return
  }

  const target = users.find((u) => u.role !== 'ADMIN') || users[0]
  console.log(`\nFeedbacks créés pour : ${target.username}`)

  await prisma.feedback.createMany({
    data: [
      {
        type: 'BUG',
        message:
          "Quand je clique sur \"Lancer l'étude\" depuis le builder, parfois la page reste blanche pendant 5-10 secondes. Cela arrive surtout sur des études contenant beaucoup de stimuli (>20).",
        page: '/studies/abc123',
        status: 'OPEN',
        userId: target.id,
      },
      {
        type: 'SUGGESTION',
        message:
          "Serait-il possible d'ajouter un raccourci clavier (Ctrl+S) pour sauvegarder une étude en cours d'édition ? Cela éviterait d'avoir à scroller jusqu'au bouton \"Enregistrer\".",
        page: '/studies/xyz789',
        status: 'OPEN',
        userId: target.id,
      },
      {
        type: 'FEATURE',
        message:
          "J'aimerais beaucoup pouvoir importer un questionnaire au format JSON pour gagner du temps. C'est un cas d'usage fréquent quand on adapte une étude existante.",
        page: '/dashboard',
        status: 'SEEN',
        userId: target.id,
      },
    ],
  })

  const count = await prisma.feedback.count({ where: { userId: target.id } })
  console.log(`\nTotal feedbacks pour ${target.username} : ${count}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
