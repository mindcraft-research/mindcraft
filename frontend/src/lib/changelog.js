// Journal des nouveautés affichées dans le pop-up « Nouveautés » du tableau
// de bord (composant WhatsNewPopup).
//
// - L'entrée la plus récente est EN TÊTE de la liste.
// - Chaque entrée a un `id` unique. Le pop-up se ré-affiche automatiquement
//   pour tout le monde dès que l'`id` de la première entrée change (on mémorise
//   le dernier `id` vu dans le navigateur).
// - Écrire des phrases simples, sans jargon : le public est varié.
//
// Pour annoncer une nouveauté : ajouter une entrée en haut avec un nouvel `id`.

export const CHANGELOG = [
  {
    id: '2026-09',
    date: 'Septembre 2026',
    items: [
      'Deux nouveaux types de questions : « liste de mots » et « code aléatoire ».',
      'Matrices : on peut répondre avec un curseur, et n’afficher certaines lignes que selon une réponse précédente.',
      'Conditions d’affichage : possibilité de combiner plusieurs critères (ET / OU).',
      'Documentation : un nouvel aide-mémoire qui explique tous les symboles.',
    ],
  },
]
