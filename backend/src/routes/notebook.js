// SPDX-License-Identifier: AGPL-3.0-or-later
'use strict'

// Cahier de laboratoire d'une étude : lecture, ajout d'entrées, export PDF.
// Volontairement AUCUNE route de modification ni de suppression : une entrée
// se rectifie par une correction qui la cite (voir lib/notebook.js).

const PDFDocument = require('pdfkit')
const { validerEntreeManuelle, nomUtilisateur, statutFr, texteDepot, grouperEntrees } = require('../lib/notebook')
const { textePdf } = require('../lib/pdfTexte')

const LIBELLES = {
  PASSATION: 'Passation', ECART: 'Écart', DECISION: 'Décision', INCIDENT: 'Incident', NOTE: 'Note', AUTO: 'Automatique',
}

module.exports = async function notebookRoutes(fastify) {
  const { prisma } = fastify
  fastify.addHook('onRequest', fastify.authenticate)

  // Étude accessible + droit d'écriture : propriétaire du projet ou
  // collaborateur ÉDITEUR. Un collaborateur LECTEUR consulte seulement.
  async function acces(studyId, userId) {
    const study = await prisma.study.findFirst({
      where: { id: studyId, project: { is: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } },
      include: { project: { select: { ownerId: true, collaborators: { where: { userId }, select: { role: true } } } } },
    })
    if (!study) return null
    const role = study.project.ownerId === userId ? 'OWNER' : study.project.collaborators[0]?.role
    return { study, peutEcrire: role === 'OWNER' || role === 'EDITOR' }
  }

  const listerEntrees = (studyId) => prisma.notebookEntry.findMany({
    where: { studyId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, kind: true, autoEvent: true, content: true, participantIds: true,
      authorName: true, createdAt: true, correctsId: true, refId: true,
    },
  })

  // ── Lire le cahier ─────────────────────────────────────────────────────────
  fastify.get('/:id/notebook', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    return reply.send({ entries: await listerEntrees(a.study.id), canWrite: a.peutEcrire })
  })

  // ── Ajouter une entrée (ou une correction) ─────────────────────────────────
  fastify.post('/:id/notebook', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent écrire dans le cahier.' })

    const { erreur, entree } = validerEntreeManuelle(req.body || {})
    if (erreur) return reply.status(400).send({ error: erreur })

    // Une correction ne peut citer qu'une entrée du même cahier.
    if (entree.correctsId) {
      const cible = await prisma.notebookEntry.findFirst({ where: { id: entree.correctsId, studyId: a.study.id }, select: { id: true } })
      if (!cible) return reply.status(400).send({ error: "L'entrée à corriger n'existe pas dans ce cahier." })
    }

    const creee = await prisma.notebookEntry.create({
      data: {
        ...entree,
        studyId: a.study.id,
        authorId: req.user.id,
        authorName: await nomUtilisateur(prisma, req.user.id),
      },
    })
    return reply.status(201).send({ entry: creee })
  })

  // ── Paquet de dépôt préparé (onglet Open Science) ─────────────────────────
  // Entrée automatique : fichiers du paquet, identifiants remplacés ou non,
  // participants exclus avec leur raison. Le paquet lui-même est construit
  // dans le navigateur : rien n'est envoyé ici que cette description.
  fastify.post('/:id/notebook/depot', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    if (!a.peutEcrire) return reply.status(403).send({ error: 'Seuls le propriétaire et les éditeurs peuvent préparer le dépôt.' })
    const { erreur, content, participantIds } = texteDepot(req.body || {})
    if (erreur) return reply.status(400).send({ error: erreur })
    const creee = await prisma.notebookEntry.create({
      data: {
        studyId: a.study.id, kind: 'AUTO', autoEvent: 'DEPOT', content, participantIds,
        authorId: req.user.id, authorName: await nomUtilisateur(prisma, req.user.id),
      },
    })
    return reply.status(201).send({ entry: creee })
  })

  // ── Export PDF (blocs dans l'ordre chronologique, corrections sous leur entrée) ──
  fastify.get('/:id/notebook/pdf', async (req, reply) => {
    const a = await acces(req.params.id, req.user.id)
    if (!a) return reply.status(404).send({ error: 'Étude introuvable.' })
    const entrees = await listerEntrees(a.study.id)
    const parId = Object.fromEntries(entrees.map((e) => [e.id, e]))
    const date = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true, info: { Title: `Cahier de laboratoire – ${a.study.name}`, Author: 'MindCraft' } })
    const morceaux = []
    doc.on('data', (c) => morceaux.push(c))
    const fini = new Promise((ok) => doc.on('end', ok))

    const NAVY = '#1e3a5f', GRIS = '#6b7280'
    doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text('Cahier de laboratoire')
    doc.moveDown(0.2).font('Helvetica').fontSize(12).fillColor('#111827').text(textePdf(a.study.name))
    doc.moveDown(0.2).fontSize(9).fillColor(GRIS)
      .text(`Statut actuel : ${statutFr(a.study.status)} · ${entrees.length} entrée${entrees.length > 1 ? 's' : ''} · exporté le ${date(new Date())} (heure de Paris)`)
    doc.text("Les entrées ne peuvent être ni modifiées ni supprimées ; une erreur est rectifiée par une correction, datée et signée, placée sous l'entrée d'origine.")
    doc.moveDown(1)

    const MARGE = doc.page.margins.left
    const ecrireEntree = (e, type) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(`${date(e.createdAt)} · ${type}`, { continued: true })
        .font('Helvetica').fillColor(GRIS).text(textePdf(`  —  ${e.authorName || 'MindCraft'}`))
    }
    const ecrireFin = (e) => {
      const pids = Array.isArray(e.participantIds) ? e.participantIds : []
      if (pids.length) doc.fontSize(9).fillColor(GRIS).text(textePdf(`Participants : ${pids.join(', ')}`))
      doc.moveDown(0.15).font('Helvetica').fontSize(10.5).fillColor('#111827').text(textePdf(e.content))
    }

    if (entrees.length === 0) doc.fontSize(11).fillColor(GRIS).text('Aucune entrée.')
    for (const { entree: e, suites } of grouperEntrees(entrees)) {
      if (doc.y > doc.page.height - 120) doc.addPage()
      const auto = e.kind === 'AUTO'
      const libelle = LIBELLES[e.kind] || e.kind
      // correctsId sur le haut d'un bloc : l'entrée citée n'est pas dans ce cahier.
      ecrireEntree(e, e.correctsId ? `Correction (${libelle})` : libelle)
      if (suites.length) {
        doc.fontSize(9).fillColor('#b45309').text(`${auto ? 'Commentée' : 'Corrigée'} : voir ci-dessous.`)
      }
      ecrireFin(e)

      for (const s of suites) {
        doc.moveDown(0.5)
        if (doc.y > doc.page.height - 120) doc.addPage()
        const pagesAvant = doc.bufferedPageRange().count
        const yDebut = doc.y
        doc.x = MARGE + 14
        ecrireEntree(s, `${auto ? 'Commentaire' : 'Correction'} (${LIBELLES[s.kind] || s.kind})`)
        if (s.correctsId !== e.id && parId[s.correctsId]) {
          doc.fontSize(9).fillColor(GRIS).text(`Corrige la correction du ${date(parId[s.correctsId].createdAt)}.`)
        }
        ecrireFin(s)
        // Filet à gauche : sur la dernière page de la correction si elle en change.
        const yHaut = doc.bufferedPageRange().count === pagesAvant ? yDebut : doc.page.margins.top
        doc.save().moveTo(MARGE + 4, yHaut).lineTo(MARGE + 4, doc.y).lineWidth(2).strokeColor(auto ? '#d1d5db' : '#f59e0b').stroke().restore()
        doc.x = MARGE
      }
      doc.moveDown(0.8)
    }

    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i)
      doc.fontSize(8).fillColor(GRIS).text(textePdf(`MindCraft · ${a.study.name} · page ${i + 1} / ${pages.count}`), 50, doc.page.height - 40, { align: 'center', lineBreak: false })
    }
    doc.end()
    await fini

    const nom = a.study.name.replace(/[^\w]/g, '_')
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="cahier_labo_${nom}.pdf"`)
      .send(Buffer.concat(morceaux))
  })
}
