# Exemples — Structure d'étude MindCraft

Ce dossier contient des fichiers de référence pour le format d'export
JSON utilisé par MindCraft. Ce format décrit la **structure complète**
d'une étude (blocs, questions, design expérimental, métadonnées Open
Science) sans contenir de données participant·e·s.

## Fichiers disponibles

| Fichier | Usage |
|---|---|
| [`study-structure-template.json`](./study-structure-template.json) | Squelette vide commenté. Point de départ pour décrire une nouvelle étude à la main, ou pour comprendre les champs disponibles. |
| [`study-structure-example.json`](./study-structure-example.json) | Exemple complet et fonctionnel : questionnaire d'attitude implicite avec une condition entre-sujets (texte d'amorçage positif vs neutre). |

## Spécification complète du format

La documentation détaillée du format (tous les champs, valeurs possibles,
contraintes) se trouve dans [`docs/json-export-format.md`](../docs/json-export-format.md).

## Comment générer un export pour une étude existante

Depuis la plateforme MindCraft :

1. Ouvrez votre étude dans le builder
2. Onglet **Export**
3. Cliquez sur **« Structure de l'étude (JSON) »**

Vous obtiendrez un fichier `mindcraft_structure_<nom>_<id>.json` au
format identique à celui des exemples ci-dessus.

## Ce que vous pouvez en faire

- **Sauvegarder** une copie locale du design d'une étude
- **Archiver** la conception en complément d'un préenregistrement OSF
- **Migrer** une étude vers une autre plateforme (PsychoPy, jsPsych,
  lab.js…) en utilisant la description structurée comme spécification
- **Réimporter** sur une instance MindCraft locale ou tierce
- **Documenter** la conception comme matériel reproductible

## À propos des champs `_doc` et `_*`

Dans le squelette, les champs commençant par un underscore (`_doc`,
`_status_values`, etc.) sont des **commentaires explicatifs** : JSON
ne supportant pas les commentaires inline, on utilise cette convention
pour documenter les valeurs autorisées et le rôle de chaque champ.
Ces champs sont ignorés à l'import et peuvent être laissés en place
ou supprimés selon vos préférences.
