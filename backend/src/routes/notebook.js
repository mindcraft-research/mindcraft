// SPDX-License-Identifier: AGPL-3.0-or-later
'use strict'

// Cahier de laboratoire d'une étude : lecture, ajout d'entrées, export PDF.
// Volontairement AUCUNE route de modification ni de suppression : une entrée
// se rectifie par une correction qui la cite (voir lib/notebook.js).

const PDFDocument = require('pdfkit')
const { validerEntreeManuelle, nomUtilisateur, statutFr } = require('../lib/notebook')
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

  // ── Export PDF (ordre chronologique) ───────────────────────────────────────
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
    doc.text("Les entrées ne peuvent être ni modifiées ni supprimées ; une erreur est rectifiée par une correction qui cite l'entrée d'origine.")
    doc.moveDown(1)

    if (entrees.length === 0) doc.fontSize(11).fillColor(GRIS).text('Aucune entrée.')
    for (const e of entrees) {
      if (doc.y > doc.page.height - 120) doc.addPage()
      // Une entrée qui cite une entrée automatique la commente ; sinon elle la corrige.
      const citeAuto = e.correctsId && parId[e.correctsId]?.kind === 'AUTO'
      const type = e.correctsId ? `${citeAuto ? 'Commentaire' : 'Correction'} (${LIBELLES[e.kind] || e.kind})` : (LIBELLES[e.kind] || e.kind)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(`${date(e.createdAt)} · ${type}`, { continued: true })
        .font('Helvetica').fillColor(GRIS).text(textePdf(`  —  ${e.authorName || 'MindCraft'}`))
      if (e.correctsId && parId[e.correctsId]) {
        doc.fontSize(9).fillColor(GRIS).text(`${citeAuto ? "Commente l'entrée automatique" : "Corrige l'entrée"} du ${date(parId[e.correctsId].createdAt)}.`)
      }
      const corrigeePar = entrees.filter((x) => x.correctsId === e.id)
      if (corrigeePar.length) {
        doc.fontSize(9).fillColor('#b45309').text(`${e.kind === 'AUTO' ? 'Commentée' : 'Corrigée'} par ${corrigeePar.map((x) => `l'entrée du ${date(x.createdAt)}`).join(', ')}.`)
      }
      const pids = Array.isArray(e.participantIds) ? e.participantIds : []
      if (pids.length) doc.fontSize(9).fillColor(GRIS).text(textePdf(`Participants : ${pids.join(', ')}`))
      doc.moveDown(0.15).font('Helvetica').fontSize(10.5).fillColor('#111827').text(textePdf(e.content))
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
