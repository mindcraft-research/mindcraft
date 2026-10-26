// SPDX-License-Identifier: AGPL-3.0-or-later
const sanitizeHtml = require('sanitize-html')

// ─── NETTOYAGE DU HTML DES TEXTES ─────────────────────────────────────────────
// Mise en forme autorisée dans les textes (éditeur, import d'études). Les
// valeurs de style sont restreintes (couleurs, tailles, alignement…) : aucun
// url(), aucune expression. Les mises en forme courantes des éditeurs
// d'autres plateformes (LimeSurvey…) passent : couleurs nommées, surlignage,
// gras en style, tailles en em / pt / %, barré, <div>, tableaux, <font color>.
const COULEUR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)$/i, /^[a-z]{3,20}$/i]
const AVEC_STYLE = ['span', 'p', 'div', 'h1', 'h2', 'h3', 'li', 'table', 'td', 'th', 'tr']
const SANITIZE_OPTIONS = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'span', 'div', 'blockquote', 'code', 'pre', 'sub', 'sup', 'hr',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption'],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    ...Object.fromEntries(AVEC_STYLE.map((t) => [t, ['style']])),
    'td': ['style', 'colspan', 'rowspan'],
    'th': ['style', 'colspan', 'rowspan'],
  },
  allowedStyles: {
    '*': {
      'color': COULEUR,
      'background-color': COULEUR,
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-size': [/^\d+(?:\.\d+)?(px|em|rem|pt|%)$/],
      'font-weight': [/^(normal|bold|bolder|lighter|[1-9]00)$/],
      'font-style': [/^(italic|normal)$/],
      'text-decoration': [/^(underline|line-through|none)$/],
    }
  },
  // Balises anciennes → équivalents autorisés.
  transformTags: {
    font: (tagName, attribs) => ({ tagName: 'span', attribs: attribs.color ? { style: `color:${attribs.color}` } : {} }),
    strike: 's',
  },
}

function sanitize(text) {
  if (!text) return text
  return sanitizeHtml(text, SANITIZE_OPTIONS)
}

module.exports = { sanitize, SANITIZE_OPTIONS }
