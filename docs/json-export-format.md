# Format d'export JSON — `mindcraft.study.structure` v1.1

Ce document spécifie le format JSON utilisé par MindCraft pour exporter
la structure d'une étude (blocs, questions, design, métadonnées). Ce
format ne contient aucune donnée participant·e — il décrit uniquement
le design.

## Vue d'ensemble

Un fichier d'export contient un objet racine `mindcraft` qui regroupe
quatre sections :

```jsonc
{
  "mindcraft": {
    "export":  { /* en-tête, métadonnées du format */ },
    "study":   { /* informations sur l'étude    */ },
    "design":  { /* plan expérimental             */ },
    "blocks":  [ /* blocs ordonnés                */ ]
  }
}
```

Voir [`examples/study-structure-example.json`](../examples/study-structure-example.json)
pour un exemple complet.

---

## 1. `mindcraft.export`

En-tête auto-descriptif du fichier.

| Champ | Type | Description |
|---|---|---|
| `schemaVersion` | string | Version du format (`"1.1"` actuellement). |
| `format` | string | Identifiant du format : `"mindcraft.study.structure"`. |
| `generatedAt` | string ISO | Date d'export. |
| `generatedBy` | string | Outil ou plateforme ayant produit le fichier. |
| `documentation` | string URL | Lien vers cette spécification. |
| `notes` | string | Note libre rédigée par l'utilisateur·rice. |

---

## 2. `mindcraft.study`

| Champ | Type | Description |
|---|---|---|
| `name` | string | Nom interne de l'étude. |
| `description` | string | Résumé court à destination des collaborateur·rice·s. |
| `status` | enum | `DRAFT` \| `VALIDATED` \| `COLLECTING` \| `COMPLETED` \| `ARCHIVED`. |
| `version` | int | Numéro de version (incrémental). |
| `metadata` | object | Métadonnées Open Science (voir ci-dessous). |
| `createdAt`, `updatedAt` | string ISO | Présents en export, ignorés à l'import. |
| `stats` | object | Compteurs récapitulatifs (lecture seule). |

### `metadata` — Métadonnées Open Science

Tous les champs sont optionnels.

| Champ | Description |
|---|---|
| `projectTitle` | Titre du projet englobant l'étude. |
| `projectDescription` | Résumé du projet. |
| `projectDoi` | DOI du projet (si publié). |
| `projectEthicsNumber` | N° d'avis éthique (CER / CPP) du projet. |
| `studyTitle` | Titre spécifique de l'étude. |
| `studyDescription` | Résumé de l'étude. |
| `preregistration` | URL du préenregistrement (OSF, AsPredicted…). |
| `materialsUrl` | Lien vers le matériel partagé. |
| `dataUrl` | Lien vers les données partagées. |
| `studyEthicsNumber` | N° d'avis éthique de l'étude (si différent du projet). |
| `keywords` | Tableau de mots-clés. |

---

## 3. `mindcraft.design`

Décrit le plan expérimental. Peut être `null` pour les études simples
sans facteurs (ex. simple questionnaire).

| Champ | Type | Description |
|---|---|---|
| `designType` | enum | `BETWEEN` (inter-sujets) \| `WITHIN` (intra) \| `MIXED` \| `NONE` (pas de manipulation). |
| `counterbalanceMethod` | enum | `LATIN_SQUARE` \| `WILLIAMS` \| `RANDOM`. |
| `quotaMode` | enum | `STRICT` \| `SOFT` (`FLEXIBLE`, ancienne valeur des exemples, est lu comme `SOFT`). |
| `targetN` | int | Effectif cible. |
| `settings` | object | (1.1) Réglages du plan, ex. `abandonAfterHours` (délai après lequel une session non terminée est comptée comme abandonnée). |
| `factors` | array | Variables indépendantes (voir ci-dessous). |

### `factors[]`

| Champ | Type | Description |
|---|---|---|
| `name` | string | Nom du facteur (ex. `"Condition"`). |
| `type` | enum | `BETWEEN` \| `WITHIN`. |
| `order` | int | Ordre d'affichage dans l'éditeur. |
| `levels` | array | Modalités du facteur (voir ci-dessous). |

### `factors[].levels[]`

| Champ | Type | Description |
|---|---|---|
| `code` | string | Code court (apparaît dans les exports CSV). |
| `name` | string | Libellé humain. |
| `order` | int | Ordre dans le facteur. |
| `id` | string | (1.1) Identifiant de référence du niveau (règles « condition expérimentale » des blocs LOGIC). |
| `blockIds` | array | `id` des blocs liés à ce niveau (voir `blocks[].id`). |

---

## 4. `mindcraft.blocks[]`

Tableau ordonné des blocs constituant l'étude. L'ordre dans le tableau
correspond à l'ordre d'affichage pour le ou la participant·e (modulo
le contrebalancement).

| Champ | Type | Description |
|---|---|---|
| `id` | string | (1.1) Identifiant de référence du bloc (voir « Identifiants et références »). |
| `type` | enum | `WELCOME` \| `INSTRUCTION` \| `QUESTION` \| `STIMULUS` \| `LOGIC` \| `DEBRIEFING`. |
| `label` | string | Étiquette interne du bloc. |
| `order` | int | Position dans l'étude. |
| `settings` | object | Configuration spécifique au type de bloc. |
| `questions` | array | (QUESTION uniquement) Questions du bloc. |
| `sequenceSteps` | array | (STIMULUS uniquement) Étapes d'un essai. |
| `stimulusFiles` | array | (STIMULUS uniquement) Références aux fichiers stimulus. |

### `settings` selon le type de bloc

#### WELCOME / INSTRUCTION / DEBRIEFING

```json
{
  "title": "Titre affiché",
  "content": "Texte (HTML autorisé)",
  "buttonLabel": "Continuer",
  "redirectUrl": ""
}
```

#### QUESTION

```json
{
  "name": "Nom interne du bloc"
}
```

#### STIMULUS

```json
{
  "name": "Nom de la tâche",
  "stimuliCount": 60,
  "trainingTrials": 10,
  "testTrials": 50,
  "randomize": true,
  "lslEnabled": false
}
```

#### LOGIC

```json
{
  "rules": [
    {
      "type": "RESPONSE_VALUE",
      "sourceQuestionCode": "consent",
      "operator": "EQUALS",
      "value": "refuse",
      "action": "JUMP_TO",
      "targetBlockId": "<id-du-bloc-cible>"
    },
    {
      "type": "CONDITION_ASSIGNMENT",
      "levelId": "<id-du-niveau>",
      "operator": "EQUALS",
      "action": "END_STUDY"
    }
  ],
  "defaultAction": "CONTINUE",
  "defaultTargetBlockId": null
}
```

Règles évaluées dans l'ordre ; la première vraie s'applique.

- `type` : `RESPONSE_VALUE` (réponse à une question, `sourceQuestionCode`)
  ou `CONDITION_ASSIGNMENT` (condition expérimentale attribuée,
  `levelId`, opérateur `EQUALS` ou `NOT_EQUALS`).
- `operator` (réponses) : `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`,
  `LESS_THAN`, `CONTAINS`, `NOT_CONTAINS`.
- `action` : `CONTINUE`, `SKIP_NEXT` (sauter le bloc suivant),
  `JUMP_TO` (aller au bloc `targetBlockId`), `END_STUDY`.
- `defaultAction` / `defaultTargetBlockId` : si aucune règle n'est vraie.

### `blocks[].questions[]`

Voir la documentation des [30+ types de questions](https://www.mindcraft-research.fr/docs)
pour les `settings` spécifiques à chaque type.

| Champ | Type | Description |
|---|---|---|
| `id` | string | (1.1) Identifiant de référence de la question. |
| `code` | string | Code unique de la question (apparaît dans les exports). |
| `type` | enum | Type de question (RADIO, LIKERT, MATRIX, SLIDER, …). |
| `text` | string | Énoncé. |
| `required` | bool | Si la réponse est obligatoire. |
| `randomize` | bool | Randomiser l'ordre des choix. |
| `order` | int | Position dans le bloc. |
| `settings` | object | Configuration spécifique au type. |
| `choices` | array | Modalités (RADIO, CHECKBOX, …) : `id` (1.1), `code`, `label`, `order`, `anchored`, `mediaUrl`, `mediaType`. |
| `matrixItems` | array | Items (MATRIX, SEMANTIC_DIFF, SIDE_BY_SIDE) : `id` (1.1), `code`, `label`, `order`, `reversed`, `left`, `right`. |

Les conditions d'affichage d'une question sont dans
`settings.displayCondition` et désignent les autres questions par leur
`code` (pas par leur `id`).

### `blocks[].sequenceSteps[]`

Pour les blocs STIMULUS uniquement. Décrit la séquence d'un essai type.

| Champ | Type | Description |
|---|---|---|
| `id` | string | (1.1) Identifiant de référence de l'étape. |
| `type` | enum | `FIXATION` \| `STIMULUS` \| `RESPONSE_KEY` \| `FEEDBACK` \| `ITI` \| `BLANK` \| `QUESTION`. |
| `order` | int | Position dans la séquence. |
| `settings` | object | Selon le type d'étape (durée, touches autorisées, etc.). |

### `blocks[].stimulusFiles[]`

Références aux fichiers (nom, type, taille, `url` sur l'instance
d'origine, `category`). **Le contenu des fichiers n'est pas inclus** :
il faut les joindre à part. Les essais choisissent les fichiers par
`category`, pas par identifiant.

---

## Identifiants et références

Depuis la version 1.1, les blocs, questions, choix, lignes de matrice,
étapes de séquence et niveaux des facteurs portent un `id`. Ce sont les identifiants de
l'instance d'origine ; ils servent seulement à relier les éléments du
fichier entre eux. À l'import, de nouveaux identifiants sont attribués
et toutes les références sont mises à jour. Un fichier écrit à la main
ou converti depuis une autre plateforme peut utiliser n'importe quelle
chaîne, du moment qu'elle est unique dans le fichier (ex. `"b1"`,
`"q-age"`).

Champs qui font référence à un `id` :

| Champ | Pointe vers |
|---|---|
| `design.factors[].levels[].blockIds[]` | `blocks[].id` |
| `blocks[].settings.rules[].levelId` (bloc LOGIC, règle `CONDITION_ASSIGNMENT`) | `design.factors[].levels[].id` |
| `blocks[].settings.rules[].targetBlockId` (bloc LOGIC) | `blocks[].id` |
| `blocks[].settings.defaultTargetBlockId` (bloc LOGIC) | `blocks[].id` |
| `blocks[].settings._questionOrder[]` | `id` des questions du même bloc |
| Clés de `study.metadata.i18n.translations.<langue>` | `b:<id du bloc>:…`, `q:<id de la question>:…`, puis `c:<id du choix>`, `m:<id de la ligne>`, `step:<id de l'étape>` |

Les fichiers 1.0 n'ont pas ces `id` : ces références n'y sont pas
résolubles (les blocs d'un niveau, les sauts de bloc, l'ordre
personnalisé des questions et les traductions sont alors perdus).

---

## Archive `.zip` (structure + fichiers)

L'export « Structure + fichiers » produit une archive :

```
structure.json        le fichier décrit ci-dessus
stimulus/<filename>   fichiers des tâches (blocks[].stimulusFiles[].filename)
medias/<nom>          médias cités par un lien « /api/media/files/<nom> »
                      (images des choix, médias des questions et des textes)
LISEZMOI.txt
```

À l'import, une archive peut aussi n'avoir qu'un seul fichier `.json` à
la racine (nom libre) à la place de `structure.json`. Les archives
compressées (deflate) sont acceptées ; ZIP64 ne l'est pas. Limites :
50 Mo pour l'archive, 300 Mo décompressés, 2 000 fichiers.

---

## Import dans MindCraft

« Importer une étude » (page d'un projet) accepte un `.json` ou un
`.zip`, ainsi qu'un questionnaire LimeSurvey (`.lss`, ou archive `.lsa`
dont seul le questionnaire est lu) ou Qualtrics (`.qsf`), converti dans
ce format avant l'import (`backend/src/lib/importLimeSurvey.js`,
`backend/src/lib/importQualtrics.js`). Le fichier est vérifié avant toute création (aperçu), puis
l'étude est créée en une fois (transaction) :

- **toujours en brouillon** (`status` et `version` du fichier ignorés),
  avec de **nouveaux identifiants** ; les références de la section
  « Identifiants et références » sont réécrites ;
- **valeurs inconnues ignorées et signalées** : type de bloc ou de
  question inconnu, facteur ni `BETWEEN` ni `WITHIN`, fichier de tâche
  d'un type non autorisé ; un `designType`, `counterbalanceMethod` ou
  `quotaMode` inconnu est remplacé par la valeur par défaut ;
- **fichiers des tâches** : repris de l'archive (`stimulus/`) ou, s'ils
  existent déjà sur l'instance, recopiés ; sinon signalés comme absents ;
- **médias** : repris de l'archive (`medias/`, renommés, liens réécrits)
  ou gardés tels quels s'ils existent déjà sur l'instance ;
- **textes HTML** (`settings.content` des blocs, `text` des questions)
  nettoyés comme lors d'une saisie dans l'éditeur ;
- **jamais importés** : participants, réponses, préenregistrement,
  cahier de laboratoire. Le cahier de la nouvelle étude commence par une
  entrée « Étude importée ».

Limites : 500 blocs, 5 000 questions, 1 000 choix (ou lignes, étapes,
niveaux) par liste.

---

## Conventions

- **Champs `_*` (underscore)** : commentaires explicatifs. Ignorés par
  les outils d'import. Présents uniquement dans les fichiers template /
  exemples.
- **Pas d'identifiant de l'instance** : ni l'étude, ni le projet, ni
  les comptes, ni les participant·e·s ne sont identifiés dans le
  fichier.
- **Ordre** : les tableaux sont toujours triés par le champ `order`.
  Lors d'un import, l'ordre du tableau prime, le champ `order` est
  recalculé.

---

## Évolution du format

La version actuelle est `1.1` (ajout des `id` et de `design.settings`
par rapport à `1.0`). Les évolutions suivent le versionnage
sémantique :

- Une **modification rétrocompatible** (ajout de champ optionnel,
  enrichissement) → bump mineur (`1.1`, `1.2`…).
- Une **modification cassante** (renommage, suppression, type modifié)
  → bump majeur (`2.0`).

Les outils d'import devraient toujours vérifier `schemaVersion` et,
au minimum, refuser les versions majeures supérieures à celle qu'ils
connaissent.
