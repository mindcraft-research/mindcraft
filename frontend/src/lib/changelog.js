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
    id: '2026-09-4',
    date: 'Septembre 2026',
    items: [
      'Suppressions : chaque suppression (bloc, question, choix, ligne de matrice, facteur, niveau, fichier stimulus, étape, phase, règle) demande désormais une confirmation explicite. Rien n’est supprimé sans avoir cliqué sur « Supprimer ».',
      'Bloc Tâche : nouvelle table « Réponse attendue et feedback » par catégorie de stimulus, avec exceptions par stimulus ; l’export des essais indique la réponse attendue et le feedback affiché.',
      'Export questionnaire : option « Inclure le temps de réponse par question ».',
      'Tâches externes : nouvelle option « Tâche immersive (plein écran) » — la tâche occupe tout l’écran, sans en-tête ni défilement possible. Recommandé pour l’eye-tracking et l’EEG.',
    ],
  },
  {
    id: '2026-09-2',
    date: 'Septembre 2026',
    items: [
      'Nouvel onglet « Mise en forme » : réglez l’apparence de toute l’étude — taille du texte, espacement, largeur, couleurs, police — plus la numérotation des questions, le masquage de la barre de progression et des libellés de boutons personnalisables.',
      'Deux nouveaux types de questions : « liste de mots » et « code aléatoire ».',
      'Matrices : on peut répondre avec un curseur, et n’afficher certaines lignes que selon une réponse précédente.',
      'Conditions d’affichage : possibilité de combiner plusieurs critères (ET / OU).',
      'Documentation : un nouvel aide-mémoire qui explique tous les symboles.',
    ],
  },
]
