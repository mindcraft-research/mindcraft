// Confirmation de suppression — service global.
//
// Toute suppression dans le builder (bloc, question, choix, ligne de matrice,
// facteur, niveau, fichier stimulus, étape, phase, règle…) passe par ici :
//
//   if (!(await confirmDelete({ what: 'le bloc « Consentement »' }))) return
//
// La promesse se résout à `true` si la personne confirme, `false` sinon
// (bouton Annuler, touche Échap, clic en dehors). Le composant qui affiche la
// fenêtre est <ConfirmDialogHost />, monté une fois dans _app.jsx : les
// composants n'ont rien à brancher.
//
// Pourquoi une fenêtre plutôt qu'un bandeau « Annuler » : le bandeau était
// furtif (8 s) et une suppression pouvait passer inaperçue. Ici rien n'est
// supprimé tant qu'on n'a pas cliqué explicitement sur « Supprimer ».

let host = null

export function registerConfirmHost(fn) {
  host = fn
  return () => { if (host === fn) host = null }
}

/**
 * @param {object} opts
 * @param {string}  opts.what     Ce qui va être supprimé, avec l'article : « la question « Q3 » ».
 * @param {string} [opts.title]   Titre de la fenêtre (défaut : « Supprimer ? »).
 * @param {string} [opts.detail]  Phrase de conséquence (défaut : action irréversible).
 * @param {string} [opts.confirmLabel]  Libellé du bouton rouge (défaut : « Supprimer »).
 * @returns {Promise<boolean>}
 */
export function confirmDelete(opts = {}) {
  if (!host) {
    // Pas d'hôte monté (test, rendu serveur) : on retombe sur la boîte native
    // plutôt que de supprimer sans demander.
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return Promise.resolve(window.confirm(`Supprimer ${opts.what || 'cet élément'} ?`))
    }
    return Promise.resolve(false)
  }
  return host(opts)
}
