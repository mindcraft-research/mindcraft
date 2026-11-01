// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du chemin sûr vers un fichier envoyé (lib/fichiers.js) : un nom venu
// de l'URL ou de la base ne doit jamais sortir du dossier « uploads ».

import { describe, it, expect } from 'vitest'
import path from 'path'
import { UPLOAD_DIR, cheminUpload } from '../src/lib/fichiers.js'

describe('cheminUpload', () => {
  it('accepte un simple nom de fichier', () => {
    expect(cheminUpload('0bcb359d8b86de0456b1895599b2a63e.jpg')).toBe(path.join(UPLOAD_DIR, '0bcb359d8b86de0456b1895599b2a63e.jpg'))
    expect(cheminUpload('mot_avec_accent.txt')).toBe(path.join(UPLOAD_DIR, 'mot_avec_accent.txt'))
    expect(cheminUpload('nom avec espaces..png')).toBe(path.join(UPLOAD_DIR, 'nom avec espaces..png'))
  })

  it('refuse tout ce qui sort du dossier', () => {
    for (const nom of [
      '../.env', '..\\.env', '..', '.', '../../../proc/self/environ',
      '/etc/passwd', 'C:\\Windows\\win.ini','a/b.jpg', 'x\0.jpg',
      '', null, undefined, 42, 'a'.repeat(300),
    ]) {
      expect(cheminUpload(nom), String(nom)).toBeNull()
    }
  })
})
