// Marqueurs LSL de structure (bloc + page) émis par le runner : module pur
// du frontend (frontend/src/lib/physioMarkers.js), testé ici faute de suite
// de tests côté frontend (cf. typesQuestions.test.js pour le même principe).
import { describe, it, expect } from 'vitest'
import { formatMarker } from '../../frontend/src/lib/lslBridge.js'
import {
  createStructureMarkers, markerNames, blockMarkerData, pageMarkerData,
} from '../../frontend/src/lib/physioMarkers.js'

const accueil = { id: 'b1', type: 'WELCOME', label: 'Accueil' }
const menace  = { id: 'b2', type: 'QUESTION', label: 'Induction de la menace' }
const mailbox = { id: 'b3', type: 'STIMULUS', label: 'MailBox' }
const fin     = { id: 'b4', type: 'DEBRIEFING', label: 'Fin' }

function enregistreur(physio) {
  const sent = []
  const seq = createStructureMarkers((m) => sent.push(m), physio)
  return { sent, seq }
}

describe('formatMarker', () => {
  it('garde le nom seul sans données (ancien format)', () => {
    expect(formatMarker('BLOCK_START')).toBe('BLOCK_START')
  })
  it('remplace espaces et signes égal dans les valeurs, ignore vides et objets', () => {
    expect(formatMarker('BLOCK_START', { idx: 2, nom: 'Induction de la  menace', x: 'a=b', vide: undefined, o: {} }))
      .toBe('BLOCK_START idx=2 nom=Induction_de_la_menace x=a_b')
  })
})

describe('données des marqueurs', () => {
  it('bloc : idx, id, nom (libellé), type', () => {
    expect(formatMarker('BLOCK_START', blockMarkerData(menace, 3)))
      .toBe('BLOCK_START idx=3 id=b2 nom=Induction_de_la_menace type=QUESTION')
  })
  it('bloc sans libellé : pas de champ nom', () => {
    expect(formatMarker('BLOCK_START', blockMarkerData({ id: 'x', type: 'INSTRUCTION', label: '  ' }, 1)))
      .toBe('BLOCK_START idx=1 id=x type=INSTRUCTION')
  })
  it('page par défaut (bloc non paginé) : 1/1, page_id = id du bloc', () => {
    expect(formatMarker('PAGE_START', pageMarkerData(mailbox, 4)))
      .toBe('PAGE_START bloc=MailBox bloc_idx=4 bloc_id=b3 page=1 pages=1 page_id=b3')
  })
  it('libellé tronqué à 80 caractères', () => {
    const d = blockMarkerData({ id: 'x', type: 'QUESTION', label: 'a'.repeat(200) }, 1)
    expect(d.nom).toHaveLength(80)
  })
  it('noms configurables, valeurs par défaut sinon', () => {
    expect(markerNames({ markerBlockStart: 'BS', markerPageEnd: 'PE' })).toEqual({
      studyStart: 'STUDY_START', studyEnd: 'STUDY_END',
      blockStart: 'BS', blockEnd: 'BLOCK_END', pageStart: 'PAGE_START', pageEnd: 'PE',
    })
    expect(markerNames(undefined).blockStart).toBe('BLOCK_START')
  })
})

describe('séquence émise', () => {
  it('premier bloc : BLOCK_START puis PAGE_START', () => {
    const { sent, seq } = enregistreur({})
    seq.enterBlock(accueil, 1)
    expect(sent).toEqual([
      'BLOCK_START idx=1 id=b1 nom=Accueil type=WELCOME',
      'PAGE_START bloc=Accueil bloc_idx=1 bloc_id=b1 page=1 pages=1 page_id=b1',
    ])
  })

  it('page 1 signalée par le bloc AVANT le BLOCK_START (effets enfant d\'abord)', () => {
    const { sent, seq } = enregistreur({})
    seq.showPage('b2', { page: 1, pages: 2, pageId: 'q1', nom: 'texte_menace' })
    expect(sent).toEqual([])
    seq.enterBlock(menace, 2)
    expect(sent[1]).toBe('PAGE_START bloc=Induction_de_la_menace bloc_idx=2 bloc_id=b2 page=1 pages=2 page_id=q1 nom=texte_menace')
  })

  it('changement de page : PAGE_END de la page quittée puis PAGE_START', () => {
    const { sent, seq } = enregistreur({})
    seq.showPage('b2', { page: 1, pages: 2, pageId: 'q1', nom: 'texte_menace' })
    seq.enterBlock(menace, 2)
    seq.showPage('b2', { page: 1, pages: 2, pageId: 'q1', nom: 'texte_menace' }) // re-rendu : ignoré
    seq.showPage('b2', { page: 2, pages: 2, pageId: 'q5', nom: 'manip_check' })
    expect(sent.slice(2)).toEqual([
      'PAGE_END bloc=Induction_de_la_menace bloc_idx=2 bloc_id=b2 page=1 pages=2 page_id=q1 nom=texte_menace',
      'PAGE_START bloc=Induction_de_la_menace bloc_idx=2 bloc_id=b2 page=2 pages=2 page_id=q5 nom=manip_check',
    ])
  })

  it('passation complète, groupe contrôle (bloc menace sauté par la logique)', () => {
    const { sent, seq } = enregistreur({})
    sent.push('STUDY_START')
    seq.enterBlock(accueil, 1)
    seq.enterBlock(mailbox, 4)       // saut : idx 2 (menace) et 3 (LOGIC) jamais affichés
    seq.enterBlock(mailbox, 4)       // effet rejoué : ignoré
    seq.enterBlock(fin, 5)
    seq.close()
    seq.close()                      // fermeture idempotente (fin + démontage)
    sent.push('STUDY_END')
    expect(sent.map((m) => m.split(' ').slice(0, 2).join(' '))).toEqual([
      'STUDY_START',
      'BLOCK_START idx=1', 'PAGE_START bloc=Accueil',
      'PAGE_END bloc=Accueil', 'BLOCK_END idx=1',
      'BLOCK_START idx=4', 'PAGE_START bloc=MailBox',
      'PAGE_END bloc=MailBox', 'BLOCK_END idx=4',
      'BLOCK_START idx=5', 'PAGE_START bloc=Fin',
      'PAGE_END bloc=Fin', 'BLOCK_END idx=5',
      'STUDY_END',
    ])
    expect(sent.some((m) => m.includes('id=b2'))).toBe(false)
  })

  it('page signalée pour un autre bloc que le courant : gardée pour lui seulement', () => {
    const { sent, seq } = enregistreur({})
    seq.enterBlock(accueil, 1)
    seq.showPage('b2', { page: 1, pages: 1, pageId: 'q1' })
    seq.enterBlock(mailbox, 2)
    expect(sent.at(-1)).toBe('PAGE_START bloc=MailBox bloc_idx=2 bloc_id=b3 page=1 pages=1 page_id=b3')
  })

  it('utilise les noms personnalisés (préfixe) de l\'étude', () => {
    const { sent, seq } = enregistreur({ markerBlockStart: 'DEBUT_BLOC', markerBlockEnd: 'FIN_BLOC', markerPageStart: 'DEBUT_PAGE', markerPageEnd: 'FIN_PAGE' })
    seq.enterBlock(accueil, 1)
    seq.close()
    expect(sent.map((m) => m.split(' ')[0])).toEqual(['DEBUT_BLOC', 'DEBUT_PAGE', 'FIN_PAGE', 'FIN_BLOC'])
  })

  it('chaque champ reste découpable par le pont (split espace, puis =)', () => {
    const { sent, seq } = enregistreur({})
    seq.enterBlock({ id: 'b9', type: 'QUESTION', label: 'Texte : « menace » = 1' }, 7)
    for (const m of sent) {
      const [, ...champs] = m.split(' ')
      for (const c of champs) expect(c.split('=')).toHaveLength(2)
    }
  })
})
