// SPDX-License-Identifier: AGPL-3.0-or-later
// Import d'une étude (lib/importStructure.js) : lecture .json / .zip,
// vérifications, nouveaux identifiants et réécriture des références.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'
import { structureEtude, referencesManquantes } from '../src/lib/structure.js'
import { preparerImport, lireFichierImport, fichiersReferences } from '../src/lib/importStructure.js'
import { creerZip, lireZip, crc32 } from '../src/lib/zip.js'

// Identifiants et noms de fichiers prévisibles.
function generateurs() {
  let n = 0, f = 0
  return { nouvelId: () => `n${++n}`, nomFichier: (ext) => `nouveau${++f}${ext}` }
}

function etude() {
  return {
    name: 'Étude test', description: 'Desc', status: 'COLLECTING', version: 4,
    metadata: {
      formatting: { theme: 'clair' },
      i18n: {
        defaultLang: 'fr', languages: ['en'],
        translations: { en: {
          'b:bAccueil:title': 'Welcome',
          'q:qAge:text': 'Your age',
          'q:qGenre:c:cF': 'Woman',
          'q:qMat:m:mUn:label': 'Item one',
          'b:bTache:step:sFix:text': 'Look',
          'fmt:buttons:nextLabel': 'Next',
          'q:qSupprimee:text': 'Gone',
        } },
      },
    },
    blocks: [
      { id: 'bAccueil', type: 'WELCOME', label: 'Accueil', order: 0, settings: { title: 'Bienvenue', content: '<p>Voir <img src="/api/media/files/logo.png"></p>' }, questions: [], sequenceSteps: [], stimulusFiles: [] },
      {
        id: 'bQuest', type: 'QUESTION', label: 'Questions', order: 1,
        settings: { _questionOrder: ['qGenre', 'qAge', 'qMat'] },
        questions: [
          { id: 'qAge', code: 'age', type: 'NUMERIC', text: 'Âge', required: true, randomize: false, order: 0, settings: {}, choices: [], matrixItems: [] },
          {
            id: 'qGenre', code: 'genre', type: 'RADIO', text: 'Genre', required: false, randomize: true, order: 1,
            settings: { displayCondition: { sourceCode: 'age', operator: 'GREATER_THAN', value: '17' } },
            choices: [{ id: 'cF', code: 'F', label: 'Femme', order: 0, anchored: false, mediaUrl: 'https://autre.exemple/api/media/files/femme.png', mediaType: 'image' }],
            matrixItems: [],
          },
          {
            id: 'qMat', code: 'mat', type: 'MATRIX', text: 'Matrice', required: false, randomize: false, order: 2, settings: {},
            choices: [], matrixItems: [{ id: 'mUn', code: 'm1', label: 'Un', order: 0, reversed: true, left: 'G', right: 'D' }],
          },
        ],
        sequenceSteps: [], stimulusFiles: [],
      },
      { id: 'bA', type: 'INSTRUCTION', label: 'Texte A', order: 2, settings: { title: 'A' }, questions: [], sequenceSteps: [], stimulusFiles: [] },
      { id: 'bB', type: 'INSTRUCTION', label: 'Texte B', order: 3, settings: { title: 'B' }, questions: [], sequenceSteps: [], stimulusFiles: [] },
      {
        id: 'bLogique', type: 'LOGIC', label: 'Logique', order: 4,
        settings: { rules: [
          { sourceCode: 'age', operator: 'LESS_THAN', value: '18', targetBlockId: 'bFin' },
          { sourceCode: 'age', operator: 'EQUALS', value: '0', targetBlockId: 'bDisparu' },
          { type: 'CONDITION_ASSIGNMENT', levelId: 'nB', operator: 'EQUALS', action: 'JUMP_TO', targetBlockId: 'bFin' },
        ], defaultTargetBlockId: 'bTache' },
        questions: [], sequenceSteps: [], stimulusFiles: [],
      },
      {
        id: 'bTache', type: 'STIMULUS', label: 'Tâche', order: 5, settings: {},
        questions: [],
        sequenceSteps: [{ id: 'sFix', type: 'FIXATION', order: 0, settings: { text: '+' } }],
        stimulusFiles: [
          { filename: 'a1.png', originalName: 'chat.png', mimetype: 'image/png', size: 3, url: '/api/stimulus/files/a1.png', category: 'animal' },
          { filename: 'a2.png', originalName: 'chien.png', mimetype: 'image/png', size: 3, url: '/api/stimulus/files/a2.png', category: 'animal' },
          { filename: 'mot.txt', originalName: 'maison', mimetype: 'text/plain', size: 0, url: '', category: 'objet' },
          { filename: 'x.exe', originalName: 'x.exe', mimetype: 'application/x-msdownload', size: 3, url: '/api/stimulus/files/x.exe', category: null },
        ],
      },
      { id: 'bFin', type: 'DEBRIEFING', label: 'Fin', order: 6, settings: {}, questions: [], sequenceSteps: [], stimulusFiles: [] },
    ],
    design: {
      designType: 'BETWEEN', counterbalanceMethod: 'RANDOM', quotaMode: 'SOFT', targetN: 80,
      settings: { abandonAfterHours: 2 },
      factors: [{ name: 'Amorçage', type: 'BETWEEN', order: 0, levels: [
        { id: 'nA', code: 'A', name: 'A', order: 0, blockIds: ['bA'] },
        { id: 'nB', code: 'B', name: 'B', order: 1, blockIds: ['bB', 'bDisparu'] },
      ] }],
    },
  }
}

const exporter = () => JSON.parse(JSON.stringify(structureEtude(etude())))

// Reconstruit l'étude telle qu'elle serait en base, pour la réexporter.
function reconstruire(d) {
  return {
    ...d.etude, status: 'DRAFT', version: 1,
    blocks: d.blocs.map((b) => ({
      ...b,
      questions: d.questions.filter((q) => q.blockId === b.id).map((q) => ({
        ...q, choices: d.choix.filter((c) => c.questionId === q.id), matrixItems: d.lignes.filter((l) => l.questionId === q.id),
      })),
      sequenceSteps: d.etapes.filter((s) => s.blockId === b.id),
      stimulusFiles: d.fichiers.filter((f) => f.blockId === b.id),
    })),
    design: d.plan ? { ...d.plan.design, factors: d.plan.facteurs.map((f) => ({ ...f, levels: d.plan.niveaux.filter((l) => l.factorId === f.id) })) } : null,
  }
}

describe('preparerImport', () => {
  it('recrée la même étude avec de nouveaux identifiants, en brouillon', () => {
    const { erreurs, donnees: d, resume } = preparerImport(exporter(), { ...generateurs(), stimulusInstance: new Set(['a1.png']) })
    expect(erreurs).toEqual([])
    expect(resume).toMatchObject({ nom: 'Étude test', format: '1.1', blocs: 7, questions: 3, facteurs: 1, niveaux: 2, langues: ['en'] })
    const ids = [d.etude.id, ...d.blocs.map((b) => b.id), ...d.questions.map((q) => q.id)]
    expect(ids.every((id) => /^n\d+$/.test(id))).toBe(true)
    expect(d.blocs.map((b) => b.label)).toEqual(['Accueil', 'Questions', 'Texte A', 'Texte B', 'Logique', 'Tâche', 'Fin'])
    expect(d.blocs.every((b) => b.studyId === d.etude.id)).toBe(true)
    expect(d.questions[1]).toMatchObject({ code: 'genre', required: false, randomize: true })
    expect(d.lignes[0]).toMatchObject({ code: 'm1', reversed: true, left: 'G', right: 'D' })
    expect(d.plan.design).toMatchObject({ designType: 'BETWEEN', counterbalanceMethod: 'RANDOM', quotaMode: 'SOFT', targetN: 80, settings: { abandonAfterHours: 2 } })
    expect(d.etude.metadata.formatting).toEqual({ theme: 'clair' })
  })

  it('réécrit toutes les références vers les nouveaux identifiants', () => {
    const { donnees: d } = preparerImport(exporter(), generateurs())
    const bloc = (label) => d.blocs.find((b) => b.label === label)
    const question = (code) => d.questions.find((q) => q.code === code)
    expect(d.plan.niveaux.map((l) => l.blockIds)).toEqual([[bloc('Texte A').id], [bloc('Texte B').id]])
    const logique = bloc('Logique').settings
    expect(logique.rules.map((r) => r.targetBlockId)).toEqual([bloc('Fin').id, null, bloc('Fin').id])
    // Règle « condition expérimentale » : vers le nouveau niveau B.
    expect(logique.rules[2].levelId).toBe(d.plan.niveaux.find((l) => l.code === 'B').id)
    expect(logique.defaultTargetBlockId).toBe(bloc('Tâche').id)
    expect(bloc('Questions').settings._questionOrder).toEqual([question('genre').id, question('age').id, question('mat').id])
    const cles = Object.keys(d.etude.metadata.i18n.translations.en)
    expect(cles).toEqual([
      `b:${bloc('Accueil').id}:title`,
      `q:${question('age').id}:text`,
      `q:${question('genre').id}:c:${d.choix[0].id}`,
      `q:${question('mat').id}:m:${d.lignes[0].id}:label`,
      `b:${bloc('Tâche').id}:step:${d.etapes[0].id}:text`,
      'fmt:buttons:nextLabel',
    ])
    // La condition d'affichage désigne les questions par leur code : inchangée.
    expect(question('genre').settings.displayCondition.sourceCode).toBe('age')
    // Réexportée, l'étude importée n'a aucune référence cassée.
    expect(referencesManquantes(structureEtude(reconstruire(d)))).toEqual([])
  })

  it('signale les liens sans cible et les ignore', () => {
    const { avertissements } = preparerImport(exporter(), generateurs())
    expect(avertissements.join(' ')).toMatch(/3 liens internes .* ignorés/)
  })

  it('fichiers de tâche : archive, instance, textes, absents et types refusés', () => {
    const zip = new Map([['stimulus/a2.png', Buffer.from('PNG')]])
    const { donnees: d, resume, avertissements } = preparerImport(exporter(), { ...generateurs(), zip, stimulusInstance: new Set(['a1.png']) })
    expect(resume.fichiers).toEqual({ zip: 1, instance: 1, absents: 0, textes: 1, refuses: 1 })
    expect(d.fichiers.map((f) => [f.source, f.filename, f.url])).toEqual([
      ['instance', 'a1.png', '/api/stimulus/files/a1.png'],
      ['zip', 'nouveau1.png', '/api/stimulus/files/nouveau1.png'],
      ['texte', 'mot.txt', ''],
    ])
    expect(avertissements.join(' ')).toMatch(/1 fichier de tâche d'un type non autorisé ignoré/)
    const sansRien = preparerImport(exporter(), generateurs())
    expect(sansRien.resume.fichiers.absents).toBe(2)
    expect(sansRien.avertissements.join(' ')).toMatch(/2 fichiers de tâche .* absents/)
  })

  it('médias : ceux de l\'archive sont renommés et tous leurs liens réécrits', () => {
    const zip = new Map([['medias/logo.png', Buffer.from('L')], ['medias/femme.png', Buffer.from('F')]])
    const { donnees: d, resume } = preparerImport(exporter(), { ...generateurs(), zip, baseApi: 'https://api.ici.fr' })
    expect(resume.medias).toEqual({ zip: 2, instance: 0, absents: 0 })
    expect(d.medias.map((m) => [m.ancien, m.filename, m.mimetype])).toEqual([['logo.png', 'nouveau1.png', 'image/png'], ['femme.png', 'nouveau2.png', 'image/png']])
    expect(d.blocs[0].settings.content).toBe('<p>Voir <img src="/api/media/files/nouveau1.png"></p>')
    // Lien complet vers une autre instance : remplacé par le lien complet local.
    expect(d.choix[0].mediaUrl).toBe('https://api.ici.fr/api/media/files/nouveau2.png')
  })

  it('médias déjà présents sur l\'instance : liens gardés ; absents : signalés', () => {
    const { donnees: d, resume, avertissements } = preparerImport(exporter(), { ...generateurs(), mediasInstance: new Set(['logo.png']) })
    expect(resume.medias).toEqual({ zip: 0, instance: 1, absents: 1 })
    expect(d.blocs[0].settings.content).toContain('/api/media/files/logo.png')
    expect(avertissements.join(' ')).toMatch(/1 média .* introuvable/)
  })

  it('fichier 1.0 (sans identifiants) : importé, avec un avertissement clair', () => {
    const dump = exporter()
    dump.mindcraft.export.schemaVersion = '1.0'
    for (const b of dump.mindcraft.blocks) {
      delete b.id
      b.questions.forEach((q) => { delete q.id; q.choices.forEach((c) => delete c.id); q.matrixItems.forEach((it) => delete it.id) })
      b.sequenceSteps.forEach((s) => delete s.id)
    }
    const { erreurs, avertissements, donnees: d } = preparerImport(dump, generateurs())
    expect(erreurs).toEqual([])
    expect(avertissements[0]).toMatch(/format 1\.0/)
    expect(d.blocs).toHaveLength(7)
    expect(d.plan.niveaux.every((l) => l.blockIds.length === 0)).toBe(true)
    expect(Object.keys(d.etude.metadata.i18n.translations.en)).toEqual(['fmt:buttons:nextLabel'])
  })

  it('fichiers d\'exemple du dépôt : importables, commentaires « _ » retirés', () => {
    for (const nom of ['study-structure-example.json', 'study-structure-template.json']) {
      const dump = JSON.parse(readFileSync(new URL(`../../examples/${nom}`, import.meta.url), 'utf8'))
      const { erreurs, avertissements, donnees: d } = preparerImport(dump, generateurs())
      expect(erreurs).toEqual([])
      expect(avertissements).toEqual([])
      expect(JSON.stringify(d)).not.toMatch(/"_(doc|note|id_doc|blockIds_doc)"/)
    }
    const exemple = JSON.parse(readFileSync(new URL('../../examples/study-structure-example.json', import.meta.url), 'utf8'))
    const { donnees: d } = preparerImport(exemple, generateurs())
    expect(d.plan.niveaux.map((l) => d.blocs.find((b) => b.id === l.blockIds[0]).label)).toEqual(["Texte d'amorçage (positif)", "Texte d'amorçage (neutre)"])
  })

  it('valeurs inconnues : types ignorés, plan corrigé, FLEXIBLE lu comme SOFT', () => {
    const dump = exporter()
    dump.mindcraft.blocks.push({ type: 'VIDEO_CALL', settings: {} })
    dump.mindcraft.blocks[1].questions.push({ code: 'x', type: 'HOLOGRAM', text: 'x' }, { code: 'age', type: 'TEXT', text: 'doublon' })
    dump.mindcraft.design.quotaMode = 'FLEXIBLE'
    dump.mindcraft.design.counterbalanceMethod = 'MAGIC'
    dump.mindcraft.design.factors.push({ name: 'Bizarre', type: 'DIAGONAL', levels: [] })
    const { erreurs, avertissements, donnees: d } = preparerImport(dump, generateurs())
    expect(erreurs).toEqual([])
    const texte = avertissements.join(' ')
    expect(texte).toContain('Blocs de type inconnu ignorés : VIDEO_CALL (1)')
    expect(texte).toContain('Questions de type inconnu ignorées : HOLOGRAM (1)')
    expect(texte).toContain('Codes de question en double (age)')
    expect(texte).toContain('1 facteur de type inconnu')
    expect(d.plan.design).toMatchObject({ quotaMode: 'SOFT', counterbalanceMethod: 'LATIN_SQUARE' })
  })

  it('refuse ce qui n\'est pas une structure MindCraft lisible', () => {
    const erreur = (dump) => preparerImport(dump, generateurs()).erreurs[0]
    expect(erreur({ hello: 1 })).toMatch(/objet « mindcraft » absent/)
    expect(erreur({ mindcraft: { export: { format: 'limesurvey' }, blocks: [] } })).toMatch(/Format « limesurvey » inconnu/)
    expect(erreur({ mindcraft: { export: { schemaVersion: '2.0' }, blocks: [] } })).toMatch(/trop récent/)
    expect(erreur({ mindcraft: { blocks: 'x' } })).toMatch(/Liste des blocs/)
    expect(erreur({ mindcraft: { blocks: Array(501).fill({ type: 'WELCOME' }) } })).toMatch(/Trop de blocs/)
    const { erreurs, donnees } = preparerImport({ mindcraft: { blocks: [] } }, generateurs())
    expect(erreurs).toEqual([])
    expect(donnees.etude.name).toBe('Étude importée')
  })
})

// Archive avec une entrée compressée (deflate), comme celles des outils courants.
function zipDeflate(nom, contenu) {
  const comp = zlib.deflateRawSync(contenu)
  const n = Buffer.from(nom)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8)
  local.writeUInt32LE(crc32(contenu), 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(contenu.length, 22); local.writeUInt16LE(n.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10)
  central.writeUInt32LE(crc32(contenu), 16); central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(contenu.length, 24); central.writeUInt16LE(n.length, 28)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(1, 8); fin.writeUInt16LE(1, 10)
  fin.writeUInt32LE(46 + n.length, 12); fin.writeUInt32LE(30 + n.length + comp.length, 16)
  return Buffer.concat([local, n, comp, central, n, fin])
}

describe('lecture des fichiers', () => {
  it('.json, avec ou sans BOM', () => {
    const texte = JSON.stringify(exporter())
    expect(lireFichierImport(Buffer.from(texte)).dump.mindcraft.study.name).toBe('Étude test')
    expect(lireFichierImport(Buffer.from('﻿' + texte)).zip).toBeNull()
    expect(() => lireFichierImport(Buffer.from('{pas du json'))).toThrow(/ni une structure MindCraft/)
  })

  it('.zip exporté par MindCraft (stocké) et .zip recompressé (deflate)', () => {
    const texte = JSON.stringify(exporter())
    const lu = lireFichierImport(creerZip([{ nom: 'structure.json', contenu: texte }, { nom: 'stimulus/a1.png', contenu: Buffer.from([1, 2, 3]) }]))
    expect(lu.dump.mindcraft.blocks).toHaveLength(7)
    expect([...lu.zip.get('stimulus/a1.png')]).toEqual([1, 2, 3])
    const recompresse = lireFichierImport(zipDeflate('mon_etude.json', Buffer.from(texte)))
    expect(recompresse.dump.mindcraft.study.name).toBe('Étude test')
  })

  it('refuse une archive sans structure, illisible ou piégée', () => {
    expect(() => lireFichierImport(creerZip([{ nom: 'a.txt', contenu: 'x' }]))).toThrow(/structure\.json/)
    expect(() => lireZip(Buffer.from('PK\u0003\u0004 pas un zip'))).toThrow(/illisible/)
    // Taille annoncée plus petite que la taille réelle : décompression bornée.
    const piege = zipDeflate('structure.json', Buffer.alloc(100000))
    piege.writeUInt32LE(10, 22) // en-tête local
    piege.writeUInt32LE(10, piege.length - 22 - 46 - 'structure.json'.length + 24) // répertoire central
    expect(() => lireZip(piege)).toThrow(/illisible/)
    expect(() => lireZip(creerZip([{ nom: 'a', contenu: 'x' }, { nom: 'b', contenu: 'y' }]), { maxEntrees: 1 })).toThrow(/plus de 1 fichiers/)
    expect(() => lireZip(creerZip([{ nom: 'a', contenu: Buffer.alloc(2000) }]), { maxTotal: 1000 })).toThrow(/trop volumineuse/)
  })

  it('repère les fichiers et médias cités', () => {
    expect(fichiersReferences(exporter())).toEqual({ stimulus: ['a1.png', 'a2.png', 'mot.txt', 'x.exe'], medias: ['logo.png', 'femme.png'] })
  })
})
