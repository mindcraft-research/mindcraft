// Journal des nouveautés affichées dans le pop-up « Nouveautés » du tableau
// de bord (composant WhatsNewPopup).
//
// - L'entrée la plus récente est EN TÊTE de la liste.
// - Chaque entrée a un `id` unique. Le pop-up se ré-affiche automatiquement
//   dès que l'`id` de la première entrée change (on mémorise le dernier `id`
//   vu dans le navigateur), et montre TOUTES les entrées pas encore vues
//   (3 au plus), pas seulement la dernière.
// - Écrire des phrases simples et courtes, sans jargon : le public est varié.
//   Le détail va dans la documentation.
//
// Pour annoncer une nouveauté : ajouter une entrée en haut avec un nouvel `id`.

export const CHANGELOG = [
  {
    id: '2026-10-12',
    date: 'Octobre 2026',
    items: [
      'Bloc Questionnaire : nouvelle option « Temps limite ». Par exemple 10 minutes pour trouver des idées : un compte à rebours s’affiche, puis l’étude passe automatiquement à la suite en gardant les réponses déjà saisies.',
    ],
  },
  {
    id: '2026-10-11',
    date: 'Octobre 2026',
    items: [
      'Question « Code aléatoire » : chaque code est désormais garanti unique dans l’étude. Pratique comme code de retrait, sans lien avec l’identité du participant.',
    ],
  },
  {
    id: '2026-10-10',
    date: 'Octobre 2026',
    items: [
      'Préenregistrement : nouveau tableau des écarts. MindCraft repère les différences entre l’étude et ce qui a été préenregistré (conditions, mesures, effectif…) et propose une catégorie et un moment ; vous ajoutez la raison et l’impact. Export en ODT ou CSV pour l’article.',
    ],
  },
  {
    id: '2026-10-9',
    date: 'Octobre 2026',
    items: [
      'Nouvel onglet « Préenregistrement » (modèle OSF) : décrivez hypothèses, plan et analyses avant la collecte, puis verrouillez. La date et l’heure sont enregistrées, et le texte ne peut plus être modifié.',
      'Une partie des réponses peut être pré-remplie à partir de la conception de l’étude.',
      'Vous obtenez un PDF, un lien pour relecture anonyme et un lien public. Un changement ultérieur s’ajoute par un amendement daté.',
    ],
  },
  {
    // Regroupe les annonces 2026-10-5 (cahier de labo), 2026-10-6 (gel,
    // codebook, export) et 2026-10-7 (arrivées simultanées), réécrites plus
    // simplement.
    id: '2026-10-8',
    date: 'Octobre 2026',
    items: [
      'Nouvel onglet « Cahier de labo » : notez au fil de l’étude comment se passent les passations, les incidents et vos décisions. Chaque note est datée et ne peut plus être modifiée.',
      'Dès le premier participant, MindCraft garde une copie de votre étude. Vous retrouvez dans le cahier de labo la version vue par les participants, même si vous modifiez l’étude ensuite.',
      'Codebook plus complet : consignes en entier, date et heure.',
      'Plus d’erreur quand beaucoup de participants ouvrent le lien en même temps (par exemple, en amphi).',
    ],
  },
  {
    id: '2026-10-4',
    date: 'Octobre 2026',
    items: [
      'Export : nouvelle option « Inclure le type d’appareil » (ordinateur, mobile ou tablette), décochée par défaut. Indicative : la détection n’est pas fiable à 100 %.',
      'Données des participants : MindCraft n’enregistre plus le texte complet d’identification du navigateur, seulement le type d’appareil. Conditions d’utilisation mises à jour (données collectées par MindCraft, liste des sous-traitants).',
    ],
  },
  {
    id: '2026-10-3',
    date: 'Octobre 2026',
    items: [
      'Export : nouvelle case « Uniquement les participants ayant terminé », valable pour tous les exports de données, avec un compteur terminés / en cours / abandonnés.',
      'Onglet Design : vous pouvez fixer un délai (en heures) au-delà duquel une passation non terminée est considérée comme abandonnée. Elle libère alors sa place dans les quotas, sans que ses réponses soient supprimées. Sans délai, rien ne change.',
    ],
  },
  {
    id: '2026-10-2',
    date: 'Octobre 2026',
    items: [
      'Statut des participants corrigé : une personne qui arrive sur le Message de fin est désormais comptée « terminée », même si elle ferme la page sans cliquer sur le bouton (elle restait « en cours » jusqu’ici). Un refus du consentement est compté comme abandon, et non plus comme terminé. S’applique aux nouvelles passations.',
    ],
  },
  {
    id: '2026-10-1',
    date: 'Octobre 2026',
    items: [
      'Images : choisissez leur taille. Question « Image » : petite, moyenne, grande, pleine largeur, taille réelle ou largeur personnalisée. Choix avec image (unique ou multiple) : petite, moyenne, grande ou taille réelle.',
      'Zoom sur les images en option : vous décidez si le participant peut agrandir une image. Désactivé par défaut sur les nouvelles questions ; les questions existantes ne changent pas.',
    ],
  },
  {
    id: '2026-09-4',
    date: 'Septembre 2026',
    items: [
      'Nouvel onglet « Langues » : proposez une même étude en plusieurs langues. Traduisez chaque texte dans une table (ou exportez / importez un fichier CSV), et diffusez un lien par langue. Un seul export pour toutes les langues, avec une colonne « lang ».',
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
