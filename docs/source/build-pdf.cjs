// SPDX-License-Identifier: AGPL-3.0-or-later
// Produit le PDF public de la documentation technique à partir de sa source HTML.
// Voir docs/source/README.md.

const fs = require('fs')
const path = require('path')
const puppeteer = require(path.join(__dirname, 'node_modules', 'puppeteer-core'))

const CHEMINS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const source = path.join(__dirname, 'documentation-technique.html')
const cible = path.join(__dirname, '..', 'MindCraft_Documentation_Technique_GitHub.pdf')

const piedDePage = `
  <div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#6b7080;padding:0 20mm;display:flex;justify-content:space-between;">
    <span>Version publique allégée - version intégrale sur demande à contact@mindcraft-research.fr</span>
    <span>Page <span class="pageNumber"></span></span>
  </div>`

async function main() {
  const executablePath = CHEMINS.find((c) => fs.existsSync(c))
  if (!executablePath) throw new Error('Chrome ou Edge introuvable : indiquez son chemin avec CHROME_PATH.')
  const navigateur = await puppeteer.launch({ executablePath, headless: 'new' })
  try {
    const page = await navigateur.newPage()
    await page.goto(`file://${source.replace(/\\/g, '/')}`, { waitUntil: 'load' })
    await page.pdf({
      path: cible,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: piedDePage,
      margin: { top: '22mm', bottom: '20mm', left: '20mm', right: '20mm' },
    })
    console.log(`PDF écrit : ${cible}`)
  } finally {
    await navigateur.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
