// SPDX-License-Identifier: AGPL-3.0-or-later
'use strict'

// Préenregistrement d'une étude (voir lib/prereg.js).
//   - routes authentifiées (préfixe /api/studies) : brouillon, verrouillage,
//     amendements, lien public, PDF ;
//   - routes publiques (préfixe /api/prereg) : consultation par lien
//     (relecteur anonyme ou public), uniquement pour un préenregistrement
//     verrouillé.
// Aucune route ne modifie ni ne supprime un préenregistrement verrouillé.

const {
  MODELE_OSF, CATEGORIES_AMENDEMENT, LONGUEUR_AMENDEMENT,
  validerBrouillon, manquants, suggestions, structureEtude, empreintePrereg, nouveauJeton, versionAnonyme, genererPdfPrereg,
} = require('../lib/prereg')
const { INCLUDE_ETUDE_COMPLETE, empreinteCourte } = require('../lib/freeze')
const { noterAuto, nomUtilisateur } = require('../lib/notebook')

const FRONT = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const lienPrereg = (jeton) => (jeton ? `${FRONT()}/prereg/${jeton}` : null)
// « Étude « cadrage » → décision » → preenregistrement_Etude_cadrage_decision.pdf
const nomFichier = (prereg, suffixe = '') => {
  const base = String(prereg.answers?.title || 'etude').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'etude'
  return `preenregistrement_${base}${suffixe}.pdf`
}
const includeAmendements = { amendments: { orderBy: { createdAt: 'asc' } } }

// Ce que voit l'équipe de l'étude (jamais les jetons d'un autre objet).
function pourEquipe(p) {
  if (!p) return null
  return {
    id: p.id, template: p.template, language: p.language, status: p.status,
    answers: p.answers || {}, authors: p.authors || [],
    fingerprint: p.fingerprint, lockedAt: p.lockedAt, lockedByName: p.lockedByName,
    publicEnabled: p.publicEnabled, updatedAt: p.updatedAt,
    links: p.status === 'LOCKED' ? { review: lienPrereg(p.reviewToken), public: lienPrereg(p.publicToken) } : null,
    amendments: (p.amendments || []).map((a) => ({ id: a.id, category: a.category, content: a.content, authorName: a.authorName, createdAt: a.createdAt })),
  }
}

// Ce que voit un visiteur avec un lien (anonyme : sans auteurs ni noms).
function pourVisiteur(p, anonyme) {
  const v = anonyme ? versionAnonyme(p) : p
  return {
    template: v.template, language: v.language, answers: v.answers || {}, authors: v.authors || [],
    fingerprint: v.fingerprint, lockedAt: v.lockedAt, lockedByName: v.lockedByName,
    amendments: (v.amendments || []).map((a) => ({ category: a.category, content: a.content, authorName: a.authorName, createdAt: a.createdAt })),
  }
}

async function preregRoutes(fastify) {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)

  // Propriétaire ou collaborateur du projet. Écrire : propriétaire ou
  // éditeur. Verrouiller, rendre public : propriétaire seulement.
  async function acces(studyId, userId, { complet = false } = {}) {
    const study = await prisma.study.findFirst({
      where: { id: studyId, project: { is: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } },
      include: {
        ...(complet ? INCLUDE_ETUDE_COMPLETE : {}),
        project: { select: { ownerId: true, collaborators: { where: { userId }, select: { role: true } } } },
      },
    })
    if (!study) return null
    const role = study.project.ownerId === userId ? 'OWNER' : study.project.collaborators[0]?.role
    return { study, peutEcrire: role === 'OWNER' || role === 'EDITOR', estProprietaire: role === 'OWNER' }
  }

  const charger = (studyId) => prisma.preregistration.findUnique({ where: { studyId }, include: includeAmendements })

  // ── Lire (avec modèle et suggestions issues de la conception) ──────────────
  fastify.get('/:id/prereg', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id, { complet: true })
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    const prereg = await charger(a.study.id)
    const nbSessions = await prisma.participantSession.count({ where: { studyId: a.study.id } })
    return reply.send({
      prereg: pourEquipe(prereg),
      template: MODELE_OSF,
      suggestions: suggestions(a.study, { nbSessions, langue: prereg?.language || 'fr' }),
      manquants: manquants(prereg),
      nbSessions,
      canWrite: a.peutEcrire,
      canLock: a.estProprietaire,
    })
  })

  // ── Enregistrer le brouillon ───────────────────────────────────────────────
  fastify.put('/:id/prereg', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent rédiger le préenregistrement.' })
    const { erreur, donnees } = validerBrouillon(req.body || {})
    if (erreur) return reply.status(400).send({ error: erreur })

    const existant = await prisma.preregistration.findUnique({ where: { studyId: a.study.id }, select: { id: true, status: true } })
    if (existant?.status === 'LOCKED') return reply.status(409).send({ error: 'Ce préenregistrement est verrouillé : il ne peut plus être modifié. Ajoutez un amendement.' })
    const prereg = existant
      // Mise à jour conditionnelle : un verrouillage simultané l'emporte.
      ? (await prisma.preregistration.updateMany({ where: { id: existant.id, status: 'DRAFT' }, data: donnees })).count
        ? await charger(a.study.id)
        : null
      : await prisma.preregistration.create({ data: { ...donnees, studyId: a.study.id }, include: includeAmendements })
    if (!prereg) return reply.status(409).send({ error: 'Ce préenregistrement vient d’être verrouillé.' })
    return reply.send({ prereg: pourEquipe(prereg), manquants: manquants(prereg) })
  })

  // ── Verrouiller (définitif) ────────────────────────────────────────────────
  fastify.post('/:id/prereg/lock', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id, { complet: true })
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.estProprietaire) return reply.status(403).send({ error: 'Seul le propriétaire de l’étude peut verrouiller le préenregistrement.' })
    if (req.body?.confirm !== true) return reply.status(400).send({ error: 'Confirmation requise.' })

    const prereg = await charger(a.study.id)
    if (!prereg) return reply.status(404).send({ error: 'Aucun préenregistrement à verrouiller.' })
    if (prereg.status === 'LOCKED') return reply.status(409).send({ error: 'Ce préenregistrement est déjà verrouillé.' })
    const { obligatoires } = manquants(prereg)
    if (obligatoires.length) return reply.status(400).send({ error: `À compléter avant de verrouiller : ${obligatoires.join(', ')}.` })

    const nbSessions = await prisma.participantSession.count({ where: { studyId: a.study.id } })
    const lockedAt = new Date()
    const fingerprint = empreintePrereg({ ...prereg, lockedAt })
    const fait = await prisma.preregistration.updateMany({
      where: { id: prereg.id, status: 'DRAFT' },
      data: {
        status: 'LOCKED', lockedAt, fingerprint,
        lockedByName: await nomUtilisateur(prisma, req.user.id),
        structure: structureEtude(a.study, { nbSessions }),
        reviewToken: nouveauJeton(), publicToken: nouveauJeton(),
      },
    })
    if (!fait.count) return reply.status(409).send({ error: 'Ce préenregistrement est déjà verrouillé.' })

    await noterAuto(prisma, {
      studyId: a.study.id, userId: req.user.id, event: 'PREREG', refId: prereg.id,
      content: `Préenregistrement verrouillé (modèle ${MODELE_OSF.nom}, empreinte ${empreinteCourte(fingerprint)}). Il ne peut plus être modifié ; les ajouts se font par amendements.`
        + (nbSessions > 0 ? ` Attention : ${nbSessions} participant${nbSessions > 1 ? 's avaient' : ' avait'} déjà commencé l’étude.` : ''),
    })
    return reply.send({ prereg: pourEquipe(await charger(a.study.id)) })
  })

  // ── Ajouter un amendement (définitif) ──────────────────────────────────────
  fastify.post('/:id/prereg/amendments', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent ajouter un amendement.' })
    const prereg = await prisma.preregistration.findUnique({ where: { studyId: a.study.id }, select: { id: true, status: true } })
    if (!prereg || prereg.status !== 'LOCKED') return reply.status(400).send({ error: 'Les amendements s’ajoutent à un préenregistrement verrouillé.' })

    const category = req.body?.category
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
    if (!CATEGORIES_AMENDEMENT[category]) return reply.status(400).send({ error: 'Catégorie inconnue.' })
    if (!content) return reply.status(400).send({ error: 'Le texte de l’amendement est vide.' })
    if (content.length > LONGUEUR_AMENDEMENT) return reply.status(400).send({ error: `Texte trop long (${LONGUEUR_AMENDEMENT} caractères au maximum).` })

    const amendement = await prisma.preregAmendment.create({
      data: { preregId: prereg.id, category, content, authorName: await nomUtilisateur(prisma, req.user.id) },
    })
    await noterAuto(prisma, {
      studyId: a.study.id, userId: req.user.id, event: 'AMENDEMENT', refId: prereg.id,
      content: `Amendement au préenregistrement (${CATEGORIES_AMENDEMENT[category].fr}) : ${content.length > 300 ? `${content.slice(0, 299)}…` : content}`,
    })
    return reply.status(201).send({ amendment: amendement })
  })

  // ── Activer / désactiver le lien public ────────────────────────────────────
  fastify.patch('/:id/prereg/public', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.estProprietaire) return reply.status(403).send({ error: 'Seul le propriétaire de l’étude peut rendre le préenregistrement public.' })
    if (typeof req.body?.enabled !== 'boolean') return reply.status(400).send({ error: 'Valeur invalide.' })
    const fait = await prisma.preregistration.updateMany({ where: { studyId: a.study.id, status: 'LOCKED' }, data: { publicEnabled: req.body.enabled } })
    if (!fait.count) return reply.status(400).send({ error: 'Le lien public s’active sur un préenregistrement verrouillé.' })
    return reply.send({ prereg: pourEquipe(await charger(a.study.id)) })
  })

  // ── PDF (complet, ou anonyme pour la relecture) ────────────────────────────
  fastify.get('/:id/prereg/pdf', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    const prereg = await charger(a.study.id)
    if (!prereg) return reply.status(404).send({ error: 'Aucun préenregistrement.' })
    const anonyme = req.query.anonyme === '1'
    const buf = await genererPdfPrereg(prereg, { anonyme, urlVerification: lienPrereg(prereg.reviewToken) })
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${nomFichier(prereg, anonyme ? '_anonyme' : '')}"`)
      .send(buf)
  })
}

// ── Consultation par lien (sans compte) ──────────────────────────────────────
async function preregPublicRoutes(fastify) {
  const { prisma } = fastify

  // Lien relecteur : toujours valide (version anonyme). Lien public : seulement
  // s'il est activé. Jamais pour un brouillon.
  async function parJeton(jeton) {
    if (typeof jeton !== 'string' || jeton.length < 16 || jeton.length > 64) return null
    const p = await prisma.preregistration.findFirst({
      where: { status: 'LOCKED', OR: [{ reviewToken: jeton }, { publicToken: jeton, publicEnabled: true }] },
      include: includeAmendements,
    })
    return p ? { prereg: p, anonyme: p.reviewToken === jeton } : null
  }

  fastify.get('/:token', async (req, reply) => {
    const r = await parJeton(req.params.token)
    if (!r) return reply.status(404).send({ error: 'Préenregistrement introuvable.' })
    return reply.send({ prereg: pourVisiteur(r.prereg, r.anonyme), anonyme: r.anonyme, template: MODELE_OSF })
  })

  fastify.get('/:token/pdf', async (req, reply) => {
    const r = await parJeton(req.params.token)
    if (!r) return reply.status(404).send({ error: 'Préenregistrement introuvable.' })
    const buf = await genererPdfPrereg(r.prereg, { anonyme: r.anonyme, urlVerification: lienPrereg(r.prereg.reviewToken) })
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${nomFichier(r.prereg, r.anonyme ? '_anonyme' : '')}"`)
      .send(buf)
  })
}

// Brouillons dont l'étude a été supprimée : sans intérêt, supprimés.
// Les préenregistrements verrouillés, eux, sont conservés.
const supprimerBrouillonsOrphelins = (prisma) => prisma.preregistration
  .deleteMany({ where: { studyId: null, status: 'DRAFT' } })
  .catch(() => null)

module.exports = { preregRoutes, preregPublicRoutes, supprimerBrouillonsOrphelins, pourEquipe, pourVisiteur }
