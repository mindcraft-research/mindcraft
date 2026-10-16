// SPDX-License-Identifier: AGPL-3.0-or-later
// ─── DOCUMENT TEXTE OPENDOCUMENT (.odt) ──────────────────────────────────────
// Format ouvert (ISO/IEC 26300), lisible par LibreOffice, Word et Google
// Docs. Document simple : titre, paragraphes, un tableau. Page A4 paysage.

const { creerZip } = require('./zip')

const echapper = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Caractères de contrôle interdits en XML (sauf tabulation et sauts de ligne).
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

// Un texte multi-lignes → plusieurs paragraphes.
const paragraphes = (texte, style = 'P') => String(texte ?? '').split(/\r?\n/)
  .map((l) => `<text:p text:style-name="${style}">${echapper(l)}</text:p>`).join('')

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
].join(' ')

const STYLES = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${NS} office:version="1.2">
<office:styles>
<style:default-style style:family="paragraph"><style:text-properties style:font-name="Liberation Sans" fo:font-family="'Liberation Sans', Arial, sans-serif" fo:font-size="10pt"/></style:default-style>
</office:styles>
<office:automatic-styles>
<style:page-layout style:name="PagePaysage"><style:page-layout-properties fo:page-width="29.7cm" fo:page-height="21cm" style:print-orientation="landscape" fo:margin-top="1.5cm" fo:margin-bottom="1.5cm" fo:margin-left="1.5cm" fo:margin-right="1.5cm"/></style:page-layout>
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PagePaysage"/></office:master-styles>
</office:document-styles>`

const STYLES_AUTO = `<office:automatic-styles>
<style:style style:name="Titre" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.2cm"/><style:text-properties fo:font-size="16pt" fo:font-weight="bold" fo:color="#1e3a5f"/></style:style>
<style:style style:name="Info" style:family="paragraph"><style:text-properties fo:font-size="9pt" fo:color="#4b5563"/></style:style>
<style:style style:name="P" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.1cm"/></style:style>
<style:style style:name="Entete" style:family="paragraph"><style:text-properties fo:font-weight="bold" fo:color="#1e3a5f"/></style:style>
<style:style style:name="Tableau" style:family="table"><style:table-properties style:width="26.7cm" table:align="margins" fo:margin-top="0.3cm"/></style:style>
<style:style style:name="Cellule" style:family="table-cell"><style:table-cell-properties fo:padding="0.12cm" fo:border="0.5pt solid #9ca3af"/></style:style>
<style:style style:name="CelluleEntete" style:family="table-cell"><style:table-cell-properties fo:padding="0.12cm" fo:border="0.5pt solid #9ca3af" fo:background-color="#e5e7eb"/></style:style>
</office:automatic-styles>`

// colonnes : [{ titre, largeur (cm) }] ; lignes : [[texte, …]].
function creerOdt({ titre, infos = [], intro = [], colonnes, lignes, apres = [] }) {
  const cols = colonnes.map((c, i) => `<style:style style:name="Col${i}" style:family="table-column"><style:table-column-properties style:column-width="${c.largeur}cm"/></style:style>`).join('')
  const stylesAuto = STYLES_AUTO.replace('</office:automatic-styles>', `${cols}</office:automatic-styles>`)
  const entete = `<table:table-row>${colonnes.map((c) => `<table:table-cell table:style-name="CelluleEntete" office:value-type="string">${paragraphes(c.titre, 'Entete')}</table:table-cell>`).join('')}</table:table-row>`
  const corps = lignes.map((l) => `<table:table-row>${l.map((v) => `<table:table-cell table:style-name="Cellule" office:value-type="string">${paragraphes(v)}</table:table-cell>`).join('')}</table:table-row>`).join('')

  const contenu = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS} office:version="1.2">${stylesAuto}
<office:body><office:text>
<text:p text:style-name="Titre">${echapper(titre)}</text:p>
${infos.map((i) => `<text:p text:style-name="Info">${echapper(i)}</text:p>`).join('')}
${intro.map((i) => paragraphes(i)).join('')}
<table:table table:name="Tableau1" table:style-name="Tableau">
${colonnes.map((_, i) => `<table:table-column table:style-name="Col${i}"/>`).join('')}
<table:table-header-rows>${entete}</table:table-header-rows>
${corps}
</table:table>
${apres.map((i) => paragraphes(i, 'Info')).join('')}
</office:text></office:body></office:document-content>`

  const manifeste = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
<manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`

  // `mimetype` en premier et non compressé : exigé par le format.
  return creerZip([
    { nom: 'mimetype', contenu: 'application/vnd.oasis.opendocument.text' },
    { nom: 'META-INF/manifest.xml', contenu: manifeste },
    { nom: 'content.xml', contenu: contenu },
    { nom: 'styles.xml', contenu: STYLES },
  ])
}

module.exports = { creerOdt, echapper }
