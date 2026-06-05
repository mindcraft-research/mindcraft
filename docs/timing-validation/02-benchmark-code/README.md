# Code source du benchmark

## Où vit le code ?

Le code du benchmark vit **dans l'application MindCraft** (sous-dossier `frontend/`), et **non dans `docs/`**. Cette séparation est volontaire : le benchmark s'exécute dans le navigateur via une page admin de MindCraft, donc son code doit être déployé avec le reste de l'application. Le dossier `docs/timing-validation/` rassemble la documentation, les données brutes et l'analyse, pas le code exécutable.

Ce fichier README sert à pointer vers le code réel sans le dupliquer.

## Liste des fichiers et liens directs

### Moteur du benchmark (JavaScript)

Dossier : [`frontend/src/lib/timing-benchmark/`](../../../frontend/src/lib/timing-benchmark/)

| Fichier | Rôle |
|---|---|
| [`stimulus.js`](../../../frontend/src/lib/timing-benchmark/stimulus.js) | Affichage du stimulus (carré blanc 200×200 sur fond noir, position figée) + capture du timestamp de paint via double `requestAnimationFrame` (méthodologie §4.0) |
| [`robot.js`](../../../frontend/src/lib/timing-benchmark/robot.js) | Robot participant : simule un appui clavier via `document.dispatchEvent(new KeyboardEvent(...))` après un délai calibré (méthodologie §4.8) |
| [`engine.js`](../../../frontend/src/lib/timing-benchmark/engine.js) | Orchestration des N essais × M conditions, capture des 5 timestamps (méthodologie §4.1), application automatique des critères d'exclusion (§4.7) |
| [`csv.js`](../../../frontend/src/lib/timing-benchmark/csv.js) | Export des résultats au format CSV avec en-tête de configuration matérielle (méthodologie §4.4) |

### Page admin (Interface utilisateur)

| Fichier | Rôle |
|---|---|
| [`frontend/src/pages/admin/timing-benchmark.jsx`](../../../frontend/src/pages/admin/timing-benchmark.jsx) | Page React `/admin/timing-benchmark` réservée aux administrateur·rice·s : formulaire de configuration, exécution du run, téléchargement du CSV |

## Comment exécuter le benchmark

1. Se connecter à MindCraft (`https://mindcraft-research.fr`) avec un compte ADMIN
2. Ouvrir la page `/admin/timing-benchmark`
3. Renseigner le formulaire (OS, navigateur, refresh rate, SHA Git de la version testée)
4. Cliquer **« Lancer le benchmark »**
5. À la fin (~15 min avec les paramètres par défaut), télécharger le CSV
6. Analyser le CSV avec [`../04-analysis.R`](../04-analysis.R) dans R

La procédure complète est détaillée dans [`../README.md`](../README.md) à la racine de `docs/timing-validation/`.

## Reproductibilité

La version exacte du code utilisée pour chaque exécution est tracée par le **SHA Git** renseigné dans le formulaire au moment du run. Ce SHA est inclus dans l'en-tête de chaque CSV brut sous `../03-raw-data/`. Toute personne peut, à partir d'un SHA donné, faire `git checkout <SHA>` et retrouver l'état exact du code utilisé.

Pour le run du 5 juin 2026 (`2026-06-05_full-run-200trials_win11-chrome149.csv`), le SHA est `414251a`.
