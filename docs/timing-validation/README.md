# Validation de la précision temporelle de MindCraft

Ce dossier regroupe tous les artefacts du projet de validation de la précision temporelle de MindCraft, organisés selon la séquence chronologique de l'étude.

## Fichiers

| Fichier | Rôle | Statut |
|---|---|---|
| `01-methodology.md` | Méthodologie pré-spécifiée — figée avant toute mesure | ✅ |
| `02-benchmark-code/` | Code source du moteur (voir [`frontend/src/lib/timing-benchmark/`](../../frontend/src/lib/timing-benchmark/) et [`frontend/src/pages/admin/timing-benchmark.jsx`](../../frontend/src/pages/admin/timing-benchmark.jsx)) | ✅ |
| `03-raw-data/` | Données brutes CSV (1 par exécution, avec en-tête de config hardware) | À générer |
| `04-analysis.R` | Script R d'analyse statistique conforme à la méthodologie | ✅ |
| `05-report.md` | Rapport final généré par le script R | À générer |

## Comment exécuter un benchmark

### 1. Préparer la machine

- Brancher l'ordinateur sur secteur, activer le mode énergie « Performances élevées »
- **Désactiver la mise en veille de l'écran ET de l'ordinateur** (Paramètres → Système → Alimentation et batterie → mettre les deux délais sur « Jamais »). Sans ça, une mise en veille pendant le run invalide toutes les données.
- Fermer les applications gourmandes (Slack, Spotify, IDE, etc.)
- Couper les notifications système (Windows : `Win + A` → « Ne pas déranger »)

### 2. Lancer le benchmark dans le navigateur

- Ouvrir une fenêtre en navigation privée (pas d'extensions)
- Se connecter sur MindCraft avec un compte ADMIN
- Aller sur `/admin/timing-benchmark`
- Renseigner le formulaire :
  - **OS** avec version exacte (ex : `Windows 11 Professionnel 25H2`)
  - **Browser** avec version exacte (ex : `Chrome 149.0.7827.53`)
  - **Refresh rate** de l'écran (ex : `60`)
  - **SHA Git** du commit testé (`git rev-parse --short HEAD`)
  - Notes libres si besoin
- Garder les paramètres méthodologiques par défaut : 200 essais/condition, conditions `200, 500, 800` ms, ITI 500-1500 ms
- Cliquer **Lancer le benchmark** → ne plus toucher à l'ordinateur pendant ~15 min
- À la fin, télécharger le CSV via le bouton dédié

### 3. Analyser le CSV avec R

1. Ouvrir `04-analysis.R` dans R ou RStudio
2. Adapter la variable `csv_path` en haut du script (chemin absolu vers le CSV téléchargé)
3. Sourcer le script : `source("04-analysis.R")`
4. Le rapport est généré au même endroit que le CSV avec le suffixe `-report.md`

Le script utilise uniquement les fonctions de base R (aucun package externe à installer).

### 4. Archiver

Une fois validé :
- Copier le CSV dans `03-raw-data/` avec un nom explicite (ex : `2026-06-05_win11-chrome149.csv`)
- Copier le rapport dans le même dossier (suffixe `-report.md`)
- Commiter les deux fichiers dans le dépôt Git pour l'archivage permanent
- Optionnel : déposer un snapshot complet sur Zenodo pour DOI

## Engagements méthodologiques rappelés

- **Pré-spécification stricte** : tout résultat doit être analysé selon les métriques, seuils et critères figés dans `01-methodology.md` AVANT l'exécution.
- **Transparence** : tous les essais (y compris exclus) sont conservés dans le CSV brut. Le script d'analyse rapporte le nombre et le pourcentage d'exclus.
- **Pas d'analyse non pré-spécifiée** : toute exploration au-delà du script `04-analysis.R` doit être explicitement étiquetée « exploratoire » dans le rapport final ou toute communication ultérieure.
- **Verdict honnête** : un run « non conforme » est rapporté tel quel, sans tentative d'ajustement post-hoc. Les corrections envisagées doivent être documentées séparément.
