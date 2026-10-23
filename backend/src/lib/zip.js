// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── ARCHIVE ZIP MINIMALE ────────────────────────────────────────────────────
// Écrit une archive ZIP sans compression (méthode « stockée »), suffisante
// pour les documents OpenDocument (.odt), qui exigent un fichier `mimetype`
// non compressé en tête. Évite une dépendance pour quelques kilo-octets.

const TABLE_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// Date et heure au format DOS (champ obligatoire du ZIP).
function dateDos(d = new Date()) {
  const heure = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  const jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { heure, jour }
}

// fichiers : [{ nom, contenu: Buffer | string }] dans l'ordre voulu.
function creerZip(fichiers, date = new Date()) {
  const { heure, jour } = dateDos(date)
  const locaux = []
  const centraux = []
  let decalage = 0

  for (const f of fichiers) {
    const nom = Buffer.from(f.nom, 'utf8')
    const donnees = Buffer.isBuffer(f.contenu) ? f.contenu : Buffer.from(String(f.contenu), 'utf8')
    const crc = crc32(donnees)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version requise
    local.writeUInt16LE(0x0800, 6) // noms en UTF-8
    local.writeUInt16LE(0, 8) // méthode : stockée
    local.writeUInt16LE(heure, 10)
    local.writeUInt16LE(jour, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(donnees.length, 18)
    local.writeUInt32LE(donnees.length, 22)
    local.writeUInt16LE(nom.length, 26)
    local.writeUInt16LE(0, 28)
    locaux.push(local, nom, donnees)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4) // version créatrice
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(heure, 12)
    central.writeUInt16LE(jour, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(donnees.length, 20)
    central.writeUInt32LE(donnees.length, 24)
    central.writeUInt16LE(nom.length, 28)
    central.writeUInt32LE(decalage, 42)
    centraux.push(central, nom)

    decalage += local.length + nom.length + donnees.length
  }

  const repertoire = Buffer.concat(centraux)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(fichiers.length, 8)
  fin.writeUInt16LE(fichiers.length, 10)
  fin.writeUInt32LE(repertoire.length, 12)
  fin.writeUInt32LE(decalage, 16)
  return Buffer.concat([...locaux, repertoire, fin])
}

// ─── LECTURE ─────────────────────────────────────────────────────────────────
// Lit une archive envoyée par un·e utilisateur·rice (import d'étude) : méthodes
// « stockée » et « deflate » (celles des outils courants), sans ZIP64. Les
// limites protègent des archives piégées (milliers d'entrées, « bombe » de
// décompression). Renvoie Map(nom → Buffer) ; les dossiers sont ignorés.
// Lève une Error au message lisible si l'archive est invalide ou trop grosse.
function lireZip(buf, { maxEntrees = 2000, maxTotal = 300 * 1024 * 1024 } = {}) {
  const zlib = require('zlib')
  const invalide = (m) => new Error(m || 'Archive ZIP illisible.')
  if (!Buffer.isBuffer(buf) || buf.length < 22) throw invalide()

  // Fin du répertoire central : dans les 22 + 65535 derniers octets.
  let fin = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fin = i; break }
  }
  if (fin < 0) throw invalide()
  const nbEntrees = buf.readUInt16LE(fin + 10)
  const debutRep = buf.readUInt32LE(fin + 16)
  if (nbEntrees === 0xffff || debutRep === 0xffffffff) throw invalide('Archive ZIP64 non prise en charge.')
  if (nbEntrees > maxEntrees) throw invalide(`Archive trop volumineuse (plus de ${maxEntrees} fichiers).`)

  const fichiers = new Map()
  let total = 0
  let p = debutRep
  for (let n = 0; n < nbEntrees; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw invalide()
    const methode = buf.readUInt16LE(p + 10)
    const tailleComp = buf.readUInt32LE(p + 20)
    const taille = buf.readUInt32LE(p + 24)
    const lNom = buf.readUInt16LE(p + 28)
    const lExtra = buf.readUInt16LE(p + 30)
    const lCom = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const nom = buf.slice(p + 46, p + 46 + lNom).toString('utf8').replace(/\\/g, '/')
    p += 46 + lNom + lExtra + lCom

    if (nom.endsWith('/')) continue
    total += taille
    if (total > maxTotal) throw invalide(`Archive trop volumineuse (plus de ${Math.round(maxTotal / 1024 / 1024)} Mo une fois décompressée).`)
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== 0x04034b50) throw invalide()
    const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const brut = buf.slice(debut, debut + tailleComp)
    if (brut.length !== tailleComp) throw invalide()

    let donnees
    if (methode === 0) donnees = brut
    else if (methode === 8) {
      try { donnees = zlib.inflateRawSync(brut, { maxOutputLength: Math.max(taille, 1) }) } catch { throw invalide() }
    } else throw invalide(`Méthode de compression non prise en charge (${methode}).`)
    if (donnees.length !== taille) throw invalide()
    fichiers.set(nom, donnees)
  }
  return fichiers
}

module.exports = { creerZip, lireZip, crc32 }
