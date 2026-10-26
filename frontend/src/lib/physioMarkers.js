/**
 * Marqueurs LSL de structure (niveau étude) : bloc et page.
 *
 * Chaque marqueur est « auto-porteur » (cf. formatMarker) : il dit quel bloc
 * et quelle page commencent ou finissent, pour qu'on puisse isoler à
 * l'analyse une page précise (ex. le texte d'induction de menace) dans
 * l'enregistrement du regard, même quand la logique saute des blocs.
 *
 *   BLOCK_START idx=3 id=ckx… nom=Induction_menace type=QUESTION
 *   PAGE_START bloc=Induction_menace bloc_idx=3 bloc_id=ckx… page=1 page_id=ckq… nom=texte_menace
 *   PAGE_END   (mêmes champs)
 *   BLOCK_END  (mêmes champs que BLOCK_START)
 *
 * Les noms (BLOCK_START, …) restent ceux réglés dans l'onglet « Mesures
 * physio » ; seules les données `clé=valeur` sont ajoutées après. Un script
 * d'analyse qui lit le premier mot du marqueur continue donc de fonctionner.
 */
import { formatMarker } from './lslBridge'

const NOM_MAX = 80

export function markerNames(physio = {}) {
  return {
    studyStart: physio?.markerStudyStart || 'STUDY_START',
    studyEnd:   physio?.markerStudyEnd   || 'STUDY_END',
    blockStart: physio?.markerBlockStart || 'BLOCK_START',
    blockEnd:   physio?.markerBlockEnd   || 'BLOCK_END',
    pageStart:  physio?.markerPageStart  || 'PAGE_START',
    pageEnd:    physio?.markerPageEnd    || 'PAGE_END',
  }
}

// Nom lisible, borné (un libellé très long alourdirait chaque marqueur).
function nom(v) {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, NOM_MAX) : undefined
}

/** Données d'un bloc ; `idx` = position (1, 2, …) dans l'ordre de passation. */
export function blockMarkerData(block, idx) {
  return {
    idx,
    id: block?.id,
    nom: nom(block?.label),
    type: block?.type,
  }
}

/**
 * Données d'une page. `page` = { page, pages, pageId, nom } ; sans info
 * (bloc non paginé : consigne, tâche, message de fin), page 1 sur 1 et
 * page_id = id du bloc.
 */
export function pageMarkerData(block, idx, page) {
  return {
    bloc: nom(block?.label),
    bloc_idx: idx,
    bloc_id: block?.id,
    page: page?.page ?? 1,
    pages: page?.pages ?? 1,
    page_id: page?.pageId ?? block?.id,
    nom: nom(page?.nom),
  }
}

/**
 * Séquenceur : garantit l'ordre PAGE_END → BLOCK_END → BLOCK_START →
 * PAGE_START, quel que soit le chemin (bloc suivant, saut logique, refus du
 * consentement, fin anticipée).
 *
 * `showPage` peut arriver AVANT `enterBlock` pour le même bloc : React exécute
 * les effets de l'enfant (QuestionBlock) avant ceux du parent (StudyRunner).
 * L'info est alors gardée et utilisée pour la page 1 du bloc.
 */
export function createStructureMarkers(send, physio) {
  const names = markerNames(physio)
  let block = null      // { block, idx }
  let page = null       // données de la page ouverte
  let pending = null    // { blockId, info } reçu avant enterBlock

  const closePage = () => {
    if (!page) return
    send(formatMarker(names.pageEnd, page))
    page = null
  }
  const openPage = (info) => {
    page = pageMarkerData(block.block, block.idx, info)
    send(formatMarker(names.pageStart, page))
  }

  return {
    enterBlock(b, idx) {
      if (!b) return
      if (block && block.block.id === b.id && block.idx === idx) return // déjà ouvert
      this.close()
      block = { block: b, idx }
      send(formatMarker(names.blockStart, blockMarkerData(b, idx)))
      const info = pending && pending.blockId === b.id ? pending.info : null
      pending = null
      openPage(info)
    },

    showPage(blockId, info) {
      if (!block || block.block.id !== blockId) {
        pending = { blockId, info }
        return
      }
      if (page && page.page === (info?.page ?? 1)) return // même page (re-rendu)
      closePage()
      openPage(info)
    },

    close() {
      closePage()
      if (block) {
        send(formatMarker(names.blockEnd, blockMarkerData(block.block, block.idx)))
        block = null
      }
    },
  }
}
