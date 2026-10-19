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
    id: '2026-10-20',
    date: 'Octobre 2026',
    items: [
      'MindCraft passe en v0.2.0, utilisée à partir du 20 octobre 2026 : préenregistrement, cahier de laboratoire et préparation du dépôt des données.',
      'Citer MindCraft : citez la version utilisée pendant votre collecte (v0.1.0 avant le 20 octobre 2026, v0.2.0 ensuite). Le codebook et le README de dépôt l’indiquent automatiquement.',
    ],
  },
  {
    id: '2026-10-18',
    date: 'Octobre 2026',
    items: [
      'Onglet Open Science : « Préparer le dépôt » rassemble en une archive (.zip) vos données, le codebook, le préenregistrement, un README et vos scripts. Vous vérifiez chaque fichier, remplacez les identifiants par des numéros, excluez des participants, puis déposez l’archive sur Recherche Data Gouv, Nakala ou Zenodo.',
    ],
  },
  {
    id: '2026-10-17',
    date: 'Octobre 2026',
    items: [
      'Onglet Open Science : décrivez aussi vos données (auteurs, contact, licence, accès, période de collecte, recrutement, anonymisation…), comme le demandent les entrepôts de données. MindCraft propose ce qu’il peut déduire de l’étude ; vous validez et modifiez.',
    ],
  },
  {
    // Regroupe les annonces 2026-10-9 à 2026-10-15 (préenregistrement,
    // écarts, code aléatoire, temps limite, e-mail du PDF, avancement,
    // simplifications), réécrites plus court. Garde l'id de la dernière
    // annonce : qui l'a déjà vue ne revoit pas le pop-up.
    id: '2026-10-15',
    date: 'Octobre 2026',
    items: [
      'Nouvel onglet « Préenregistrement » : rédigez, puis verrouillez. Vous obtenez un PDF et des liens à partager. Fait ailleurs, ou pas de préenregistrement ? Indiquez-le.',
      'Les écarts au préenregistrement sont repérés automatiquement, dans un tableau à joindre à l’article.',
      '« Avancement de l’étude », dans la colonne de gauche : où en est chaque étape.',
      'Questionnaire : temps limite par bloc, avec ou sans compte à rebours.',
      'Code aléatoire : chaque code est unique dans l’étude.',
      'Plus simple : « Mise en forme » et « Langues » réunis en un onglet ; les info-bulles ⓘ s’ouvrent aussi au clic.',
    ],
  },
  {
    // Regroupe les annonces 2026-10-1 à 2026-10-8.
    id: '2026-10-8',
    date: 'Octobre 2026',
    items: [
      'Nouvel onglet « Cahier de labo » : notez passations, incidents et décisions. Chaque note est datée et ne se modifie plus.',
      'Dès le premier participant, MindCraft garde une copie de l’étude telle que vue par les participants.',
      'Plus d’erreur quand beaucoup de participants arrivent en même temps (en amphi, par exemple).',
      'Export : option « Uniquement les participants ayant terminé », et type d’appareil en option.',
      'Design : délai après lequel une passation inachevée est comptée comme abandonnée.',
      'Images : taille au choix, zoom en option.',
      'Conditions d’utilisation mises à jour : seul le type d’appareil des participants est enregistré.',
    ],
  },
  {
    // Regroupe les annonces 2026-09-2 et 2026-09-4.
    id: '2026-09-4',
    date: 'Septembre 2026',
    items: [
      'Étude en plusieurs langues : traduisez les textes et diffusez un lien par langue.',
      'Mise en forme de l’étude : taille du texte, couleurs, police, libellés des boutons…',
      'Nouvelles questions « Liste de mots » et « Code aléatoire » ; matrices avec curseur.',
      'Conditions d’affichage combinables (ET / OU).',
      'Tâches : réponse attendue et feedback par catégorie ; mode plein écran pour l’eye-tracking et l’EEG.',
      'Chaque suppression demande une confirmation.',
    ],
  },
]
