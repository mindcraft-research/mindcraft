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
const { Prisma } = require('@prisma/client')
const { INCLUDE_ETUDE_COMPLETE, empreinteCourte } = require('../lib/freeze')
const { noterAuto, nomUtilisateur } = require('../lib/notebook')
const { sendPreregLockedEmail } = require('../lib/email')
const { detecterEcarts, rapport, resume, validerEcart } = require('../lib/deviations')
const { exporterEcarts } = require('../lib/deviationsExport')

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
    withdrawnAt: p.withdrawnAt, withdrawalReason: p.withdrawalReason,
    emailDelivery: p.emailDelivery || null,
    links: p.status === 'LOCKED' ? { review: lienPrereg(p.reviewToken), public: lienPrereg(p.publicToken) } : null,
    amendments: (p.amendments || []).map((a) => ({ id: a.id, category: a.category, content: a.content, authorName: a.authorName, createdAt: a.createdAt })),
  }
}

// Ce que voit un visiteur avec un lien (anonyme : sans auteurs ni noms).
// Retiré : uniquement l'avis de retrait.
function pourVisiteur(p, anonyme) {
  if (p.withdrawnAt) {
    return {
      withdrawn: true, withdrawnAt: p.withdrawnAt, withdrawalReason: p.withdrawalReason,
      template: p.template, language: p.language, lockedAt: p.lockedAt, fingerprint: p.fingerprint,
      answers: {}, authors: [], amendments: [], lockedByName: null,
    }
  }
  const v = anonyme ? versionAnonyme(p) : p
  return {
    withdrawn: false,
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

    // Sur demande (case cochée au verrouillage) : PDF envoyé au propriétaire
    // et aux auteurs qui ont un e-mail. Un échec d'envoi ne remet jamais en
    // cause le verrouillage (il est indiqué).
    if (req.body?.envoyerPdf === true) {
      await envoyerPdfAuxAuteurs(await charger(a.study.id), a.study.project.ownerId)
    }
    return reply.send({ prereg: pourEquipe(await charger(a.study.id)) })
  })

  async function envoyerPdfAuxAuteurs(prereg, ownerId) {
    try {
      const proprietaire = await prisma.user.findUnique({ where: { id: ownerId }, select: { email: true } })
      const vus = new Set([String(proprietaire?.email || '').toLowerCase()])
      const auteurs = []
      for (const au of prereg.authors || []) {
        const e = String(au?.email || '').trim()
        if (e && !vus.has(e.toLowerCase())) { vus.add(e.toLowerCase()); auteurs.push(e) }
      }
      const pdf = await genererPdfPrereg(prereg, { urlVerification: lienPrereg(prereg.reviewToken) })
      const r = await sendPreregLockedEmail({
        to: proprietaire?.email, bcc: auteurs, langue: prereg.language,
        titre: String(prereg.answers?.title || '').trim(), verrouilleLe: prereg.lockedAt, verrouillePar: prereg.lockedByName,
        empreinte: prereg.fingerprint, lien: lienPrereg(prereg.reviewToken), pdf, nomFichier: nomFichier(prereg),
      })
      await prisma.preregistration.update({
        where: { id: prereg.id },
        data: { emailDelivery: { at: new Date().toISOString(), recipients: [proprietaire?.email, ...auteurs].filter(Boolean), ok: r.success, error: r.success ? null : r.error } },
      })
    } catch (err) {
      fastify.log.warn({ err }, 'envoi du PDF du préenregistrement impossible')
    }
  }

  // ── Ajouter un amendement (définitif) ──────────────────────────────────────
  fastify.post('/:id/prereg/amendments', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent ajouter un amendement.' })
    const prereg = await prisma.preregistration.findUnique({ where: { studyId: a.study.id }, select: { id: true, status: true, withdrawnAt: true } })
    if (!prereg || prereg.status !== 'LOCKED') return reply.status(400).send({ error: 'Les amendements s’ajoutent à un préenregistrement verrouillé.' })
    if (prereg.withdrawnAt) return reply.status(410).send({ error: 'Ce préenregistrement a été retiré.' })

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
    if (prereg.withdrawnAt) return reply.status(410).send({ error: 'Ce préenregistrement a été retiré : son contenu a été effacé.' })
    const anonyme = req.query.anonyme === '1'
    const buf = await genererPdfPrereg(prereg, { anonyme, urlVerification: lienPrereg(prereg.reviewToken) })
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${nomFichier(prereg, anonyme ? '_anonyme' : '')}"`)
      .send(buf)
  })

  // ══ Écarts au préenregistrement (voir lib/deviations.js) ═══════════════════
  // Préenregistrement verrouillé (et non retiré) requis. Lecture : toute
  // l'équipe ; annotations et écarts déclarés : propriétaire et éditeurs.
  async function chargerEcarts(a) {
    const prereg = await prisma.preregistration.findUnique({
      where: { studyId: a.study.id },
      include: { ...includeAmendements, deviations: { orderBy: { createdAt: 'asc' } } },
    })
    if (!prereg) return { erreur: [404, 'Aucun préenregistrement.'] }
    if (prereg.status !== 'LOCKED') return { erreur: [400, 'Les écarts se suivent une fois le préenregistrement verrouillé.'] }
    if (prereg.withdrawnAt) return { erreur: [410, 'Ce préenregistrement a été retiré.'] }

    const studyId = a.study.id
    const [stats, termines, versions, ecartsCahier, objectif, sortieCollecte] = await Promise.all([
      prisma.participantSession.aggregate({ where: { studyId }, _min: { allocatedAt: true }, _max: { allocatedAt: true, completedAt: true } }),
      prisma.participantSession.count({ where: { studyId, status: 'COMPLETED' } }),
      prisma.studyVersion.findMany({ where: { studyId, createdAt: { gt: prereg.lockedAt } }, select: { version: true, createdAt: true, snapshot: true }, orderBy: { createdAt: 'asc' } }),
      prisma.notebookEntry.findMany({ where: { studyId, kind: 'ECART', createdAt: { gte: prereg.lockedAt } }, select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
      prisma.notebookEntry.findFirst({ where: { studyId, kind: 'AUTO', autoEvent: 'DESIGN', content: { contains: 'objectif' }, createdAt: { gte: prereg.lockedAt } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
      // Fin de collecte : dernière sortie du statut « En collecte » (cahier de labo).
      prisma.notebookEntry.findFirst({ where: { studyId, kind: 'AUTO', autoEvent: 'STATUS', content: { startsWith: 'Statut : En collecte →' } }, select: { createdAt: true }, orderBy: { createdAt: 'desc' } }),
    ])
    const fins = [stats._max.allocatedAt, stats._max.completedAt].filter(Boolean).map((d) => new Date(d))
    const ctx = {
      prereg, study: a.study, lockedAt: prereg.lockedAt,
      premiereSession: stats._min.allocatedAt, derniereActivite: fins.length ? new Date(Math.max(...fins)) : null,
      collecteEnCours: a.study.status === 'COLLECTING', termines,
      finCollecte: a.study.status === 'COLLECTING' ? null : sortieCollecte?.createdAt || null,
      premierExport: prereg.firstDataExportAt, versions, ecartsCahier, objectifModifieLe: objectif?.createdAt || null,
    }
    const langue = prereg.language === 'en' ? 'en' : 'fr'
    const detectes = detecterEcarts(ctx, langue)
    const lignes = rapport(detectes, prereg.deviations, ctx, langue)
    return { prereg, ctx, detectes, lignes, langue }
  }

  const envoyerErreur = (reply, [code, message]) => reply.status(code).send({ error: message })

  fastify.get('/:id/prereg/deviations', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id, { complet: true })
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    const r = await chargerEcarts(a)
    if (r.erreur) return envoyerErreur(reply, r.erreur)
    return reply.send({
      lignes: r.lignes, resume: resume(r.lignes), langue: r.langue, canWrite: a.peutEcrire,
      contexte: {
        collecteEnCours: r.ctx.collecteEnCours, termines: r.ctx.termines,
        objectifPrevu: r.prereg.structure?.targetN ?? null, premierExport: r.ctx.premierExport,
      },
    })
  })

  // Annotation d'un écart détecté (catégorie, moment, raison, impact).
  fastify.put('/:id/prereg/deviations/detected', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id, { complet: true })
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent compléter les écarts.' })
    const r = await chargerEcarts(a)
    if (r.erreur) return envoyerErreur(reply, r.erreur)
    const key = req.body?.key
    if (!r.detectes.some((d) => d.key === key)) return reply.status(400).send({ error: 'Cet écart n’est plus détecté.' })
    const { erreur, donnees } = validerEcart(req.body)
    if (erreur) return reply.status(400).send({ error: erreur })
    const auteur = await nomUtilisateur(prisma, req.user.id)
    await prisma.preregDeviation.upsert({
      where: { preregId_key: { preregId: r.prereg.id, key } },
      create: { ...donnees, key, preregId: r.prereg.id, updatedByName: auteur },
      update: { ...donnees, updatedByName: auteur },
    })
    return reply.send({ ok: true })
  })

  // Écart déclaré à la main (ce que MindCraft ne peut pas voir : analyses,
  // hypothèses…). Modifiable et supprimable.
  fastify.post('/:id/prereg/deviations', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent déclarer un écart.' })
    const r = await chargerEcarts(a)
    if (r.erreur) return envoyerErreur(reply, r.erreur)
    const { erreur, donnees } = validerEcart(req.body, { manuel: true })
    if (erreur) return reply.status(400).send({ error: erreur })
    const cree = await prisma.preregDeviation.create({ data: { ...donnees, preregId: r.prereg.id, updatedByName: await nomUtilisateur(prisma, req.user.id) } })
    return reply.status(201).send({ id: cree.id })
  })

  async function ecartDeclare(a, devId) {
    const p = await prisma.preregistration.findUnique({ where: { studyId: a.study.id }, select: { id: true, status: true, withdrawnAt: true } })
    if (!p || p.status !== 'LOCKED' || p.withdrawnAt) return null
    return prisma.preregDeviation.findFirst({ where: { id: devId, preregId: p.id, key: null } })
  }

  fastify.put('/:id/prereg/deviations/:devId', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent modifier un écart.' })
    const d = await ecartDeclare(a, req.params.devId)
    if (!d) return reply.status(404).send({ error: 'Écart introuvable.' })
    const { erreur, donnees } = validerEcart(req.body, { manuel: true })
    if (erreur) return reply.status(400).send({ error: erreur })
    await prisma.preregDeviation.update({ where: { id: d.id }, data: { ...donnees, updatedByName: await nomUtilisateur(prisma, req.user.id) } })
    return reply.send({ ok: true })
  })

  fastify.delete('/:id/prereg/deviations/:devId', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent supprimer un écart.' })
    const d = await ecartDeclare(a, req.params.devId)
    if (!d) return reply.status(404).send({ error: 'Écart introuvable.' })
    await prisma.preregDeviation.delete({ where: { id: d.id } })
    return reply.send({ ok: true })
  })

  // ── Export du tableau d'écarts : ODT (texte ouvert) ou CSV ─────────────────
  fastify.get('/:id/prereg/deviations/export', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id, { complet: true })
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    const r = await chargerEcarts(a)
    if (r.erreur) return envoyerErreur(reply, r.erreur)
    const format = req.query.format === 'csv' ? 'csv' : 'odt'
    const { buffer, type } = exporterEcarts(r, { format, lien: lienPrereg(r.prereg.reviewToken) })
    return reply
      .header('Content-Type', type)
      .header('Content-Disposition', `attachment; filename="${nomFichier(r.prereg).replace(/^preenregistrement_/, 'ecarts_').replace(/\.pdf$/, `.${format}`)}"`)
      .send(buffer)
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
    if (r.prereg.withdrawnAt) return reply.status(410).send({ error: 'Ce préenregistrement a été retiré.' })
    const buf = await genererPdfPrereg(r.prereg, { anonyme: r.anonyme, urlVerification: lienPrereg(r.prereg.reviewToken) })
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${nomFichier(r.prereg, r.anonyme ? '_anonyme' : '')}"`)
      .send(buf)
  })
}

// ── Retrait (administration) ─────────────────────────────────────────────────
// À la demande des auteurs, transmise via le contact des CGU. Le contenu est
// effacé (texte, auteurs, amendements, état de l'étude) ; les liens restent
// valides et affichent la date et le motif du retrait, la date de
// verrouillage et l'empreinte. Définitif.

// Lien collé (https://…/prereg/<jeton>) ou jeton seul → préenregistrement.
async function trouverParLien(prisma, lien) {
  const jeton = String(lien || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop()
  if (!jeton || jeton.length < 16 || jeton.length > 64) return null
  return prisma.preregistration.findFirst({
    where: { status: 'LOCKED', OR: [{ reviewToken: jeton }, { publicToken: jeton }] },
    include: { study: { select: { name: true, project: { select: { owner: { select: { username: true, email: true } } } } } } },
  })
}

const LONGUEUR_MOTIF = 1000

async function retirerPrereg(prisma, { id, motif }) {
  const raison = String(motif || '').trim()
  if (!raison) return { erreur: 'Indiquez le motif du retrait.' }
  if (raison.length > LONGUEUR_MOTIF) return { erreur: `Motif trop long (${LONGUEUR_MOTIF} caractères au maximum).` }
  const p = await prisma.preregistration.findUnique({ where: { id }, select: { id: true, status: true, withdrawnAt: true, studyId: true } })
  if (!p || p.status !== 'LOCKED') return { erreur: 'Préenregistrement verrouillé introuvable.' }
  if (p.withdrawnAt) return { erreur: 'Ce préenregistrement est déjà retiré.' }

  const withdrawnAt = new Date()
  await prisma.$transaction([
    prisma.preregAmendment.deleteMany({ where: { preregId: id } }),
    prisma.preregistration.update({
      where: { id },
      data: { answers: {}, authors: [], structure: Prisma.DbNull, lockedByName: null, withdrawnAt, withdrawalReason: raison },
    }),
  ])
  if (p.studyId) {
    await noterAuto(prisma, {
      studyId: p.studyId, event: 'PREREG_RETRAIT', refId: id,
      content: `Préenregistrement retiré à la demande de ses auteurs (motif : ${raison.length > 300 ? `${raison.slice(0, 299)}…` : raison}). Son contenu a été effacé ; ses liens affichent l’avis de retrait.`,
    })
  }
  return { withdrawnAt }
}

// Brouillons dont l'étude a été supprimée : sans intérêt, supprimés.
// Les préenregistrements verrouillés, eux, sont conservés.
const supprimerBrouillonsOrphelins = (prisma) => prisma.preregistration
  .deleteMany({ where: { studyId: null, status: 'DRAFT' } })
  .catch(() => null)

module.exports = { preregRoutes, preregPublicRoutes, supprimerBrouillonsOrphelins, pourEquipe, pourVisiteur, trouverParLien, retirerPrereg }
