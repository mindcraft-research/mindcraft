// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── ARCHIVE ZIP DANS LE NAVIGATEUR ──────────────────────────────────────────
// Écrit une archive ZIP sans compression (méthode « stockée »), comme
// backend/src/lib/zip.js, mais dans le navigateur : les fichiers ajoutés par
// le chercheur (scripts, données nettoyées…) ne quittent pas son ordinateur.
// Taille maximale : 4 Go (pas de ZIP64).

const TABLE_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(octets) {
  let c = 0xffffffff
  for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// Date et heure au format DOS (champ obligatoire du ZIP).
function dateDos(d) {
  return {
    heure: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    jour: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

const versOctets = (contenu) => {
  if (contenu instanceof Uint8Array) return contenu
  if (contenu instanceof ArrayBuffer) return new Uint8Array(contenu)
  return new TextEncoder().encode(String(contenu ?? ''))
}

// fichiers : [{ nom, contenu: Uint8Array | ArrayBuffer | string }] dans
// l'ordre voulu (noms en UTF-8, « dossier/fichier » accepté). Renvoie un Blob.
export function creerZip(fichiers, date = new Date()) {
  const { heure, jour } = dateDos(date)
  const morceaux = []
  const centraux = []
  let decalage = 0

  for (const f of fichiers) {
    const nom = new TextEncoder().encode(f.nom)
    const donnees = versOctets(f.contenu)
    const crc = crc32(donnees)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version requise
    local.setUint16(6, 0x0800, true) // noms en UTF-8
    local.setUint16(8, 0, true) // méthode : stockée
    local.setUint16(10, heure, true)
    local.setUint16(12, jour, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, donnees.length, true)
    local.setUint32(22, donnees.length, true)
    local.setUint16(26, nom.length, true)
    local.setUint16(28, 0, true)
    morceaux.push(local.buffer, nom, donnees)

    const central = new DataView(new ArrayBuffer(46))
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 20, true) // version créatrice
    central.setUint16(6, 20, true)
    central.setUint16(8, 0x0800, true)
    central.setUint16(10, 0, true)
    central.setUint16(12, heure, true)
    central.setUint16(14, jour, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, donnees.length, true)
    central.setUint32(24, donnees.length, true)
    central.setUint16(28, nom.length, true)
    central.setUint32(42, decalage, true)
    centraux.push(new Uint8Array(central.buffer), nom)

    decalage += 30 + nom.length + donnees.length
  }

  const tailleRepertoire = centraux.reduce((n, c) => n + c.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, fichiers.length, true)
  fin.setUint16(10, fichiers.length, true)
  fin.setUint32(12, tailleRepertoire, true)
  fin.setUint32(16, decalage, true)

  return new Blob([...morceaux, ...centraux, fin.buffer], { type: 'application/zip' })
}
