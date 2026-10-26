// SPDX-License-Identifier: AGPL-3.0-or-later
// Nettoyage du HTML des textes (lib/sanitize.js) : la mise en forme courante
// (dont celle de l'éditeur de LimeSurvey) passe ; le code dangereux non.

import { describe, it, expect } from 'vitest'
import { sanitize } from '../src/lib/sanitize.js'

describe('mise en forme conservée', () => {
  it.each([
    ['<p><span style="color:#e74c3c;">rouge</span></p>', '<p><span style="color:#e74c3c">rouge</span></p>'],
    ['<span style="color:red">rouge nommé</span>', '<span style="color:red">rouge nommé</span>'],
    ['<span style="font-weight:bold">gras</span>', '<span style="font-weight:bold">gras</span>'],
    ['<span style="background-color:#f1c40f;">surligné</span>', '<span style="background-color:#f1c40f">surligné</span>'],
    ['<span style="font-size:1.2em">grand</span>', '<span style="font-size:1.2em">grand</span>'],
    ['<span style="font-size:14pt">14 pt</span>', '<span style="font-size:14pt">14 pt</span>'],
    ['<div style="text-align:center"><b>centré</b></div>', '<div style="text-align:center"><b>centré</b></div>'],
    ['<p><font color="#ff0000">ancienne balise</font></p>', '<p><span style="color:#ff0000">ancienne balise</span></p>'],
    ['<s>barré</s> <strike>aussi</strike>', '<s>barré</s> <s>aussi</s>'],
    ['<p style="color: rgb(192, 57, 43); font-weight: 700;">mix</p>', '<p style="color:rgb(192, 57, 43);font-weight:700">mix</p>'],
    ['<table><tr><td colspan="2">cellule</td></tr></table>', '<table><tr><td colspan="2">cellule</td></tr></table>'],
  ])('%s', (entree, attendu) => {
    expect(sanitize(entree)).toBe(attendu)
  })
})

describe('code dangereux retiré', () => {
  it('scripts, gestionnaires d\'événements, styles avec url()', () => {
    expect(sanitize('<p onclick="alert(1)">a</p><script>alert(2)</script>')).toBe('<p>a</p>')
    expect(sanitize('<span style="background-color:url(javascript:alert(1))">x</span>')).toBe('<span>x</span>')
    expect(sanitize('<span style="color:expression(alert(1))">x</span>')).toBe('<span>x</span>')
    expect(sanitize('<img src=x onerror=alert(1)>')).toBe('')
    expect(sanitize('<a href="javascript:alert(1)">lien</a>')).toBe('<a>lien</a>')
    // Couleur piégée : seule la partie autorisée reste.
    expect(sanitize('<font color="red;background:url(x)">x</font>')).toBe('<span style="color:red">x</span>')
  })
})
