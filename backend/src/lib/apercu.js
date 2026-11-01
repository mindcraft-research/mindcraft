// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── CLÉ D'APERÇU D'UNE ÉTUDE ────────────────────────────────────────────────
// L'aperçu (/run/:id?preview=<clé>) montre l'étude, même en brouillon, sans
// rien enregistrer. Il n'est plus ouvert à quiconque connaît l'identifiant de
// l'étude : il faut la clé, que l'équipe obtient dans le constructeur (bouton
// « Prévisualiser », lien à partager avec des collègues sans compte).

const crypto = require('crypto')

const nouvelleCle = () => crypto.randomBytes(18).toString('base64url')

// Clé de l'étude, créée au premier besoin.
async function cleApercu(prisma, studyId) {
  const existante = await prisma.studyPreviewKey.findUnique({ where: { studyId }, select: { key: true } })
  if (existante) return existante.key
  try {
    return (await prisma.studyPreviewKey.create({ data: { studyId, key: nouvelleCle() }, select: { key: true } })).key
  } catch (err) {
    // Deux demandes simultanées : on reprend la clé créée par l'autre.
    if (err.code !== 'P2002') throw err
    return (await prisma.studyPreviewKey.findUnique({ where: { studyId }, select: { key: true } })).key
  }
}

// Nouvelle clé : l'ancien lien d'aperçu ne marche plus.
async function changerCleApercu(prisma, studyId) {
  const key = nouvelleCle()
  await prisma.studyPreviewKey.upsert({ where: { studyId }, create: { studyId, key }, update: { key, createdAt: new Date() } })
  return key
}

// La clé reçue est-elle celle de l'étude ?
async function cleApercuValide(prisma, studyId, cle) {
  if (typeof cle !== 'string' || !cle) return false
  const ligne = await prisma.studyPreviewKey.findUnique({ where: { studyId }, select: { key: true } })
  if (!ligne) return false
  const a = Buffer.from(cle)
  const b = Buffer.from(ligne.key)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = { cleApercu, changerCleApercu, cleApercuValide }
