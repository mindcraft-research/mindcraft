// Cahier de laboratoire : chaque correction (ou commentaire d'une entrée
// automatique) s'affiche dans le bloc de l'entrée qu'elle cite.
//
// entries : ordre chronologique, comme renvoyé par le serveur. Renvoie les blocs
// dans ce même ordre : { entree, suites }, suites = corrections du bloc, de la
// plus ancienne à la plus récente. Une correction de correction reste dans le
// bloc de l'entrée d'origine ; une correction dont la cible est introuvable
// forme son propre bloc.
export function grouperEntrees(entries) {
  const blocDe = new Map() // id d'une entrée déjà vue → son bloc
  const blocs = []
  for (const e of entries) {
    // Une entrée ne peut citer qu'une entrée plus ancienne, donc déjà vue.
    let bloc = blocDe.get(e.correctsId)
    if (bloc) {
      bloc.suites.push(e)
    } else {
      bloc = { entree: e, suites: [] }
      blocs.push(bloc)
    }
    blocDe.set(e.id, bloc)
  }
  return blocs
}

// Filtre par type : un bloc reste visible dès qu'une de ses entrées a ce type.
export function blocCorrespond(bloc, filtre) {
  if (filtre === 'TOUS') return true
  return [bloc.entree, ...bloc.suites].some((e) => e.kind === filtre)
}
