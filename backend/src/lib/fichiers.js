// SPDX-License-Identifier: AGPL-3.0-or-later
// Dossier des fichiers envoyés (médias, stimuli) et chemin sûr vers un
// fichier de ce dossier.
//
// Un nom de fichier vient de l'URL (routes publiques /files/:filename) ou de
// la base (stimuli textuels nommés d'après le mot saisi) : il ne doit jamais
// permettre de sortir du dossier (« ../.env », « ..\\x », « /proc/... »).
const path = require('path')
const fs = require('fs')

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// Chemin absolu du fichier `filename` dans UPLOAD_DIR, ou null si le nom
// n'est pas un simple nom de fichier (séparateur, « .. », caractère nul…).
function cheminUpload(filename) {
  if (typeof filename !== 'string' || !filename || filename.length > 255) return null
  if (/[\/\\\0]/.test(filename) || filename === '.' || filename === '..') return null
  const chemin = path.resolve(UPLOAD_DIR, filename)
  if (path.dirname(chemin) !== UPLOAD_DIR) return null
  return chemin
}

module.exports = { UPLOAD_DIR, cheminUpload }
