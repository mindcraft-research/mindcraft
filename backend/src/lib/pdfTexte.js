// SPDX-License-Identifier: AGPL-3.0-or-later
// Les polices standard du PDF (Helvetica, jeu WinAnsi) ne contiennent pas
// certains symboles saisis couramment : on les remplace par un équivalent
// lisible, dans le PDF seulement (le texte enregistré reste intact).
const SUBSTITUTIONS_PDF = [[/→/g, '->'], [/←/g, '<-'], [/↔/g, '<->'], [/≥/g, '>='], [/≤/g, '<='], [/≠/g, '!='], [/≈/g, '~'], [/[✓✔]/g, 'v'], [/[✗✘]/g, 'x'], [/ | /g, ' ']]
const textePdf = (s) => SUBSTITUTIONS_PDF.reduce((t, [re, r]) => t.replace(re, r), String(s ?? ''))
  // Tout autre caractère hors du jeu WinAnsi (emoji, alphabet non latin…) → « ? ».
  .replace(/[^\u0000-ÿŒœŠšŸŽžƒˆ˜–—‘-„†-•…‰‹›€™]/gu, '?')

module.exports = { textePdf }
