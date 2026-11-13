// Suivi des modifications non enregistrées dans l'éditeur d'étude.
//
// Règle de l'éditeur :
//   - ce que l'on coche ou choisit (interrupteur, liste) s'enregistre seul ;
//   - ce que l'on écrit dans un formulaire s'enregistre avec son bouton.
//
// Ce module sert au second cas. Un formulaire déclare son état avec
// useSuiviModifications(valeur) ; tant qu'il diffère de l'état de départ :
//   - le formulaire peut l'afficher (<EtatEnregistrement />) ;
//   - fermer l'onglet du navigateur demande confirmation ;
//   - changer d'onglet ou de bloc dans l'éditeur demande confirmation
//     (confirmerAbandon, appelé par la page de l'étude).

import { useEffect, useRef, useState } from 'react'
import { confirmDelete } from './confirm'

// Formulaires actuellement modifiés et non enregistrés.
const modifies = new Set()

export function aDesModificationsNonEnregistrees() {
  return modifies.size > 0
}

/**
 * À appeler avant de quitter un formulaire sans passer par son bouton
 * (changement d'onglet, de bloc…). Se résout à `true` si l'on peut continuer.
 */
export async function confirmerAbandon() {
  if (!aDesModificationsNonEnregistrees()) return true
  return confirmDelete({
    title: 'Quitter sans enregistrer ?',
    message: 'Des modifications ne sont pas enregistrées : elles seront perdues.',
    detail: 'Cliquez sur « Annuler » pour rester, puis sur « Enregistrer ».',
    confirmLabel: 'Quitter sans enregistrer',
    ton: 'attention',
  })
}

/**
 * Déclare qu'un formulaire a (ou n'a plus) des modifications non enregistrées.
 * Pour un composant qui calcule déjà lui-même cet état.
 */
export function useSignalerModifications(modifie) {
  const id = useRef(null)
  if (!id.current) id.current = {}
  useEffect(() => {
    if (modifie) modifies.add(id.current)
    else modifies.delete(id.current)
    return () => { modifies.delete(id.current) }
  }, [modifie])
  // Fermer l'onglet ou recharger la page : le navigateur demande confirmation.
  useEffect(() => {
    if (!modifie) return undefined
    const avertir = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avertir)
    return () => window.removeEventListener('beforeunload', avertir)
  }, [modifie])
}

/**
 * Compare `valeur` (l'état du formulaire) à son état de départ.
 *
 * L'état de départ est relevé un court instant après l'ouverture, une fois
 * les valeurs par défaut posées, et à nouveau quand `cle` change (par exemple
 * l'identifiant du bloc affiché).
 *
 * @returns {{ modifie: boolean, marquerEnregistre: () => void }}
 *   `marquerEnregistre` est à appeler après un enregistrement réussi.
 */
export function useSuiviModifications(valeur, cle = null) {
  const courant = JSON.stringify(valeur ?? null)
  const dernier = useRef(courant)
  dernier.current = courant
  const depart = useRef(null)
  const [pret, setPret] = useState(false)
  const [, rafraichir] = useState(0)

  useEffect(() => {
    setPret(false)
    const t = setTimeout(() => { depart.current = dernier.current; setPret(true) }, 400)
    return () => clearTimeout(t)
  }, [cle])

  const modifie = pret && courant !== depart.current
  useSignalerModifications(modifie)

  const marquerEnregistre = () => {
    depart.current = dernier.current
    rafraichir((n) => n + 1)
  }
  return { modifie, marquerEnregistre }
}
