// SPDX-License-Identifier: AGPL-3.0-or-later
// Export du tableau d'écarts au préenregistrement : ODT (document texte
// ouvert, à joindre à l'article) ou CSV. Langue : celle du préenregistrement.

const { CATEGORIES, textes } = require('./deviations')
const { creerOdt } = require('./odt')

const L = {
  fr: {
    titre: 'Écarts au préenregistrement', sansTitre: 'Sans titre',
    verrouille: (d, e) => `Préenregistrement verrouillé sur MindCraft le ${d} · empreinte ${e}`,
    lien: (u) => `Consultation : ${u}`,
    genere: (d) => `Tableau généré le ${d} par MindCraft`,
    enCours: 'Collecte en cours',
    terminee: (n) => `Collecte terminée : ${n} participant${n > 1 ? 's' : ''} ayant terminé`,
    resume: (n, parCat) => (n === 0 ? 'Aucun écart détecté ni déclaré.' : `${n} écart${n > 1 ? 's' : ''} : ${parCat}.`),
    colonnes: ['N°', 'Écart', 'Catégorie', 'Moment', 'Raison', 'Impact'],
    detecte: '(détecté par MindCraft)', declare: '(déclaré par les auteurs)', vide: '—',
    note: 'Les écarts « détectés par MindCraft » ont été repérés automatiquement en comparant l’étude au préenregistrement verrouillé, puis complétés par les auteurs ; les autres ont été déclarés par les auteurs.',
    csv: ['numero', 'ecart', 'origine', 'categorie', 'moment', 'raison', 'impact'], origine: { oui: 'détecté', non: 'déclaré' },
    pluriel: (mot, n) => (n > 1 && mot !== 'sans objet' ? `${mot}s` : mot),
    date: (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' }),
  },
  en: {
    titre: 'Deviations from the preregistration', sansTitre: 'Untitled',
    verrouille: (d, e) => `Preregistration locked on MindCraft on ${d} · fingerprint ${e}`,
    lien: (u) => `View: ${u}`,
    genere: (d) => `Table generated on ${d} by MindCraft`,
    enCours: 'Data collection ongoing',
    terminee: (n) => `Data collection completed: ${n} participant${n > 1 ? 's' : ''} completed the study`,
    resume: (n, parCat) => (n === 0 ? 'No deviation detected or reported.' : `${n} deviation${n > 1 ? 's' : ''}: ${parCat}.`),
    colonnes: ['No.', 'Deviation', 'Category', 'Timing', 'Reason', 'Impact'],
    detecte: '(detected by MindCraft)', declare: '(reported by the authors)', vide: '—',
    note: 'Deviations "detected by MindCraft" were identified automatically by comparing the study with the locked preregistration, then completed by the authors; the others were reported by the authors.',
    csv: ['number', 'deviation', 'source', 'category', 'timing', 'reason', 'impact'], origine: { oui: 'detected', non: 'reported' },
    pluriel: (mot, n) => (n > 1 && mot === 'clarification' ? 'clarifications' : mot),
    date: (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' }),
  },
}

const echapperCsv = (v) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const empreinteCourte = (h) => String(h || '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ')

// r : résultat de chargerEcarts (prereg, ctx, lignes, langue).
function exporterEcarts(r, { format = 'odt', lien = null, maintenant = new Date() } = {}) {
  const langue = r.langue === 'en' ? 'en' : 'fr'
  const t = L[langue]
  const cat = (c) => CATEGORIES[c]?.[langue] || c
  const lignes = r.lignes

  if (format === 'csv') {
    const corps = lignes.map((l, i) => [i + 1, l.description, l.detecte ? t.origine.oui : t.origine.non, cat(l.categorie), l.moment, l.raison, l.impact].map(echapperCsv).join(','))
    // BOM : les accents s'affichent correctement à l'ouverture dans un tableur.
    return { buffer: Buffer.from(`﻿${[t.csv.join(','), ...corps].join('\n')}\n`, 'utf8'), type: 'text/csv; charset=utf-8' }
  }

  const parCat = Object.keys(CATEGORIES)
    .map((c) => [c, lignes.filter((l) => l.categorie === c).length])
    .filter(([, n]) => n > 0)
    .map(([c, n]) => `${n} ${t.pluriel(cat(c).toLowerCase(), n)}`)
    .join(', ')
  const buffer = creerOdt({
    titre: t.titre,
    infos: [
      String(r.prereg.answers?.title || '').trim() || t.sansTitre,
      t.verrouille(t.date(r.prereg.lockedAt), empreinteCourte(r.prereg.fingerprint)),
      ...(lien ? [t.lien(lien)] : []),
      r.ctx.collecteEnCours ? t.enCours : t.terminee(r.ctx.termines),
      t.genere(t.date(maintenant)),
    ],
    intro: [t.resume(lignes.length, parCat)],
    colonnes: [
      { titre: t.colonnes[0], largeur: 1 }, { titre: t.colonnes[1], largeur: 7.5 }, { titre: t.colonnes[2], largeur: 2.4 },
      { titre: t.colonnes[3], largeur: 4.6 }, { titre: t.colonnes[4], largeur: 5.6 }, { titre: t.colonnes[5], largeur: 5.6 },
    ],
    lignes: lignes.map((l, i) => [
      String(i + 1), `${l.description}\n${l.detecte ? t.detecte : t.declare}`, cat(l.categorie),
      l.moment || t.vide, l.raison || t.vide, l.impact || t.vide,
    ]),
    apres: [t.note],
  })
  return { buffer, type: 'application/vnd.oasis.opendocument.text' }
}

module.exports = { exporterEcarts, textesExport: L, textes }
