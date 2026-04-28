# Format d'export JSON — `mindcraft.study.structure` v1.0

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
| `schemaVersion` | string | Version du format (`"1.0"` actuellement). |
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
| `designType` | enum | `BETWEEN` (inter-sujets) \| `WITHIN` (intra) \| `MIXED`. |
| `counterbalanceMethod` | enum | `LATIN_SQUARE` \| `WILLIAMS` \| `RANDOM`. |
| `quotaMode` | enum | `STRICT` \| `FLEXIBLE`. |
| `targetN` | int | Effectif cible. |
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
| `blockIds` | array | (Pour les facteurs WITHIN) IDs des blocs liés à ce niveau. |

---

## 4. `mindcraft.blocks[]`

Tableau ordonné des blocs constituant l'étude. L'ordre dans le tableau
correspond à l'ordre d'affichage pour le ou la participant·e (modulo
le contrebalancement).

| Champ | Type | Description |
|---|---|---|
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
      "type": "response",
      "sourceCode": "consent",
      "operator": "equals",
      "value": "refuse",
      "action": "skip_to",
      "targetBlockId": "<id-du-bloc-cible>"
    }
  ],
  "defaultAction": "CONTINUE"
}
```

### `blocks[].questions[]`

Voir la documentation des [30+ types de questions](https://www.mindcraft-research.fr/docs)
pour les `settings` spécifiques à chaque type.

| Champ | Type | Description |
|---|---|---|
| `code` | string | Code unique de la question (apparaît dans les exports). |
| `type` | enum | Type de question (RADIO, LIKERT, MATRIX, SLIDER, …). |
| `text` | string | Énoncé. |
| `required` | bool | Si la réponse est obligatoire. |
| `randomize` | bool | Randomiser l'ordre des choix. |
| `order` | int | Position dans le bloc. |
| `settings` | object | Configuration spécifique au type. |
| `choices` | array | Modalités (RADIO, CHECKBOX, …). |
| `matrixItems` | array | Items (MATRIX, SEMANTIC_DIFF, SIDE_BY_SIDE). |

### `blocks[].sequenceSteps[]`

Pour les blocs STIMULUS uniquement. Décrit la séquence d'un essai type.

| Champ | Type | Description |
|---|---|---|
| `type` | enum | `FIXATION` \| `STIMULUS` \| `RESPONSE_KEY` \| `FEEDBACK` \| `ITI` \| `BLANK` \| `QUESTION`. |
| `order` | int | Position dans la séquence. |
| `settings` | object | Selon le type d'étape (durée, touches autorisées, etc.). |

---

## Conventions

- **Champs `_*` (underscore)** : commentaires explicatifs. Ignorés par
  les outils d'import. Présents uniquement dans les fichiers template /
  exemples.
- **IDs internes** : les exports n'incluent pas les IDs de base de
  données (ils n'auraient pas de sens hors de l'instance d'origine).
  Les références entre blocs (ex. logique conditionnelle) utilisent
  les `code` ou `label` quand possible.
- **Ordre** : les tableaux sont toujours triés par le champ `order`.
  Lors d'un import, l'ordre du tableau prime, le champ `order` est
  recalculé.

---

## Évolution du format

La version actuelle est `1.0`. Les évolutions futures suivront le
versionnage sémantique :

- Une **modification rétrocompatible** (ajout de champ optionnel,
  enrichissement) → bump mineur (`1.1`, `1.2`…).
- Une **modification cassante** (renommage, suppression, type modifié)
  → bump majeur (`2.0`).

Les outils d'import devraient toujours vérifier `schemaVersion` et,
au minimum, refuser les versions majeures supérieures à celle qu'ils
connaissent.
