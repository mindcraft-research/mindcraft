// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── CODE ALÉATOIRE GARANTI UNIQUE ───────────────────────────────────────────
// Question RANDOM_CODE : chaque « # » du format est remplacé par un chiffre
// aléatoire (ex. F##Y#### → F42Y1387). Le code est tiré par le SERVEUR et
// réservé en base (table random_codes, contrainte d'unicité par étude et par
// question) : deux participants ne peuvent pas recevoir le même code, même
// s'ils arrivent au même instant. Un participant qui recharge la page
// retrouve son code.
//
// Usage typique : code de retrait (le participant le note et le donne au
// chercheur pour retrouver ses données, sans lien avec son identité).

const crypto = require('node:crypto')

const FORMAT_PAR_DEFAUT = 'F##Y####'
const ESSAIS_MAX = 40
// Jusqu'à 100 000 codes possibles (5 « # »), on liste les codes libres.
const LIMITE_ENUMERATION = 100000

const tirer = (format) => String(format || FORMAT_PAR_DEFAUT).replace(/#/g, () => String(crypto.randomInt(10)))
const combinaisons = (format) => 10 ** (String(format || FORMAT_PAR_DEFAUT).match(/#/g) || []).length

// Renvoie { code } ou { statut, erreur }.
async function attribuerCode(prisma, { studyId, participantId, questionCode }) {
  if (!participantId || !questionCode) return { statut: 400, erreur: 'participantId et questionCode requis.' }

  const session = await prisma.participantSession.findUnique({
    where: { studyId_participantId: { studyId, participantId } },
    select: { id: true },
  })
  if (!session) return { statut: 404, erreur: 'Session introuvable.' }

  // Le format vient de l'étude, jamais du navigateur.
  const question = await prisma.question.findFirst({
    where: { code: questionCode, type: 'RANDOM_CODE', block: { studyId } },
    select: { settings: true },
  })
  if (!question) return { statut: 404, erreur: 'Question introuvable.' }
  const format = question.settings?.mask || FORMAT_PAR_DEFAUT
  if (combinaisons(format) < 2) return { statut: 409, erreur: 'Le format du code ne contient aucun « # » : impossible de produire des codes différents.' }

  // Déjà attribué (page rechargée) : le même code.
  const existant = await prisma.randomCode.findUnique({
    where: { sessionId_questionCode: { sessionId: session.id, questionCode } },
    select: { code: true },
  })
  if (existant) return { code: existant.code }

  const petit = combinaisons(format) <= LIMITE_ENUMERATION
  for (let essai = 0; essai < ESSAIS_MAX; essai++) {
    let code
    if (petit) {
      // Format court : tirage parmi les codes encore libres (sinon, presque
      // épuisé, le hasard raterait les derniers codes disponibles).
      const libres = await codesLibres(prisma, { studyId, questionCode, format })
      if (!libres.length) break
      code = libres[crypto.randomInt(libres.length)]
    } else {
      code = tirer(format)
      // Codes enregistrés avant cette garantie (réponses déjà en base) : évités.
      const ancien = await prisma.questionResponse.findFirst({ where: { studyId, questionCode, value: { equals: code } }, select: { id: true } })
      if (ancien) continue
    }
    try {
      await prisma.randomCode.create({ data: { studyId, questionCode, code, sessionId: session.id } })
      return { code }
    } catch (err) {
      if (err.code !== 'P2002') throw err
      // Même participant, deux demandes simultanées : reprendre son code.
      const sien = await prisma.randomCode.findUnique({ where: { sessionId_questionCode: { sessionId: session.id, questionCode } }, select: { code: true } })
      if (sien) return { code: sien.code }
      // Sinon, code pris entre-temps par un autre participant : nouveau tirage.
    }
  }
  return { statut: 409, erreur: 'Plus aucun code disponible pour ce format : allongez-le (ajoutez des « # »).' }
}

// Format court : tous les codes du format, moins ceux déjà attribués ou déjà
// présents dans les réponses enregistrées avant cette garantie.
async function codesLibres(prisma, { studyId, questionCode, format }) {
  const pris = new Set((await prisma.randomCode.findMany({ where: { studyId, questionCode }, select: { code: true } })).map((c) => c.code))
  for (const r of await prisma.questionResponse.findMany({ where: { studyId, questionCode }, select: { value: true } })) {
    if (typeof r.value === 'string') pris.add(r.value)
  }
  const n = (format.match(/#/g) || []).length
  const libres = []
  for (let i = 0; i < 10 ** n; i++) {
    const chiffres = String(i).padStart(n, '0')
    let k = 0
    const code = format.replace(/#/g, () => chiffres[k++])
    if (!pris.has(code)) libres.push(code)
  }
  return libres
}

module.exports = { FORMAT_PAR_DEFAUT, tirer, combinaisons, attribuerCode }
