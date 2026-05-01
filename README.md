# MindCraft

**Plateforme web de conception et de collecte d'études expérimentales pour les sciences humaines et sociales.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Live](https://img.shields.io/badge/Live-mindcraft--research.fr-6366F1)](https://www.mindcraft-research.fr)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19864887.svg)](https://doi.org/10.5281/zenodo.19864887)

---

## Présentation

MindCraft est une plateforme libre permettant à des chercheur·e·s, étudiant·e·s
et praticien·ne·s en SHS et sciences expérimentales de concevoir des études en
ligne et d'en collecter les données, sans qu'il soit nécessaire de savoir
programmer. L'accès est gratuit et strictement non commercial.

🌐 **Démo en ligne** : <https://www.mindcraft-research.fr>

### Fonctionnalités principales

- **30+ types de questions** — choix unique/multiple, échelles de Likert,
  matrice, différentiel sémantique, somme constante, classement par
  glisser-déposer, texte à trous, zone cliquable, calcul automatique, et plus
- **Tâches expérimentales** — séquences d'essais (fixation, stimulus, capture
  de réponse avec temps de réaction, feedback, ITI), durées variables, phases
  d'entraînement / test, randomisation
- **Mesures physiologiques** — marqueurs LSL en temps réel pour EEG, ECG, EMG
  et eye-tracking (compatible BrainVision, BIOPAC, Tobii, OpenBCI…)
- **Design expérimental** — plans inter-sujets, intra-sujets et mixtes avec
  contrebalancement automatique (carré latin, Williams, randomisation)
- **Open Science** — métadonnées dédiées (préenregistrement, DOI, avis éthique
  CER/CPP, mots-clés), codebook PDF généré automatiquement, export JSON de la
  structure des études pour archivage et reproductibilité
- **RGPD** — données hébergées en France, consentement éclairé intégré, aucune
  transmission à des tiers
- **Collaboratif** — gestion d'équipes avec rôles (propriétaire, éditeur, lecteur)

## Stack technique

- **Frontend** — Next.js (React), JavaScript
- **Backend** — Fastify (Node.js), Prisma ORM
- **Base de données** — PostgreSQL
- **Hébergement** — Scaleway Serverless Containers (région `fr-par`)
- **Authentification** — JWT + refresh tokens, 2FA TOTP optionnelle
- **CI/CD** — GitHub Actions

## Installation locale

### Prérequis

- [Node.js](https://nodejs.org/) 20+
- [PostgreSQL](https://www.postgresql.org/download/) 14+
- [npm](https://www.npmjs.com/) (livré avec Node.js)

### Cloner le dépôt

```bash
git clone https://github.com/mindcraft-research/mindcraft.git
cd mindcraft
```

### Backend

```bash
cd backend
cp .env.example .env       # Configurer DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma db push         # Créer les tables
npm run dev                # Démarre sur http://localhost:3002
```

### Frontend

```bash
cd frontend
cp .env.example .env.local # Configurer NEXT_PUBLIC_API_URL
npm install
npm run dev                # Démarre sur http://localhost:3000
```

### Tests

```bash
cd backend
npm test
```

## Architecture du dépôt

```
mindcraft/
├── backend/              # API Fastify + Prisma + PostgreSQL
│   ├── src/
│   │   ├── routes/       # auth, études, design, export, stimulus, media
│   │   ├── lib/          # helpers (création d'étude de démo, etc.)
│   │   └── plugins/      # plugin Prisma
│   ├── prisma/           # schéma et migrations
│   └── scripts/          # scripts utilitaires
├── frontend/             # Next.js + React
│   └── src/
│       ├── pages/        # routes (dashboard, auth, studies, docs, settings)
│       ├── components/
│       │   ├── builder/  # constructeur d'études
│       │   ├── runner/   # moteur de passation
│       │   └── stimulus/ # moteur de tâches expérimentales
│       └── lib/          # client API, store d'auth, pont LSL
├── examples/             # exemples et template du format d'export JSON
├── docs/                 # documentation technique et spécifications
└── .github/workflows/    # CI/CD
```

## Conception

MindCraft a été conçue et développée par **Dayle DAVID, PhD**, enseignante-chercheuse
en psychologie sociale (Université Rennes 2 / LP3C).

Développée avec l'assistance de **Claude Code** (Anthropic). L'architecture, les
choix fonctionnels et le contenu scientifique relèvent de la responsabilité
exclusive de l'auteure.

## Licence

Le code source est publié sous **GNU Affero General Public License v3.0 ou
ultérieure** (`AGPL-3.0-or-later`). Voir le fichier [`LICENSE`](./LICENSE).

⚠️ La licence AGPL ne s'applique qu'au **code source**. Le **service hébergé**
sur <https://www.mindcraft-research.fr> est régi par ses propres
[Conditions Générales d'Utilisation](https://www.mindcraft-research.fr/terms),
qui en restreignent l'usage à des fins strictement non commerciales (recherche,
enseignement, apprentissage).

Si vous souhaitez forker MindCraft pour un usage commercial, vous devez :
1. Respecter intégralement les obligations de l'AGPL-3.0 (notamment publier
   votre code dérivé sous AGPL si vous l'hébergez en service)
2. Ne pas réutiliser la marque « MindCraft » ni les contenus du site
   officiel sans autorisation

## Contribuer

Les contributions sont bienvenues ! Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md)
pour les modalités (issues, pull requests, conventions de code, accord de
licence des contributeurs).

## Citer ce projet

Si MindCraft a été utile à vos travaux de recherche, merci de bien vouloir
citer le projet. Le fichier [`CITATION.cff`](./CITATION.cff) à la racine
du dépôt fournit les informations bibliographiques au format Citation File
Format. GitHub propose automatiquement un bouton **« Cite this repository »**
dans la barre latérale.

## Contact

📧 contact@mindcraft-research.fr
