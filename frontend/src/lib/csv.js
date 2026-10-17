// SPDX-License-Identifier: AGPL-3.0-or-later
// Lecture et écriture des CSV exportés par MindCraft (virgule, guillemets
// doublés, retours à la ligne possibles dans une cellule), pour le paquet de
// dépôt : choix des colonnes, exclusions, identifiants remplacés.

// Texte CSV → tableau de lignes (tableaux de cellules).
export function lireCsv(texte) {
  const lignes = []
  let ligne = []
  let cellule = ''
  let guillemets = false
  const t = String(texte || '').replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (guillemets) {
      if (c === '"') {
        if (t[i + 1] === '"') { cellule += '"'; i++ } else guillemets = false
      } else cellule += c
    } else if (c === '"') guillemets = true
    else if (c === ',') { ligne.push(cellule); cellule = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      ligne.push(cellule); lignes.push(ligne); ligne = []; cellule = ''
    } else cellule += c
  }
  if (cellule !== '' || ligne.length) { ligne.push(cellule); lignes.push(ligne) }
  return lignes
}

const echapper = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Tableau de lignes → texte CSV (même format que les exports MindCraft).
export const ecrireCsv = (lignes) => lignes.map((l) => l.map(echapper).join(',')).join('\n')
