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

| Couche | Technologie |
|---|---|
| Frontend | [Next.js](https://nextjs.org/) 14 (React 18) |
| Backend | [Fastify](https://fastify.dev/) 4 (Node.js 20) |
| ORM | [Prisma](https://www.prisma.io/) 5 |
| Base de données | [PostgreSQL](https://www.postgresql.org/) 16 |
| Conteneurs | [Docker](https://www.docker.com/) (multi-stage builds) |
| CI/CD | GitHub Actions |
| Hébergement | [Scaleway](https://www.scaleway.com/) Serverless Containers (région `fr-par`) |
| Authentification | JWT + refresh tokens, 2FA TOTP (`otplib`), bcrypt |

---

## 🚀 Démarrage rapide (Docker)

**Pour tester la plateforme rapidement** sur votre machine, sans rien installer
d'autre que Docker. Une seule commande :

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, macOS) ou
  [Docker Engine](https://docs.docker.com/engine/install/) (Linux)
- Aucun autre prérequis : Node.js, PostgreSQL et toutes les dépendances sont
  embarqués dans les conteneurs.

### Lancer la plateforme

```bash
git clone https://github.com/mindcraft-research/mindcraft.git
cd mindcraft
docker compose up
```

Au premier lancement, Docker télécharge les images de base (Node, PostgreSQL),
construit les images backend et frontend, et démarre les trois conteneurs
(`db`, `backend`, `frontend`). Comptez 2 à 5 minutes la première fois,
quelques secondes les fois suivantes.

Une fois démarré, ouvrez :

- **Frontend** : <http://localhost:3000>
- **API backend** : <http://localhost:3002>

Pour arrêter la plateforme : `Ctrl+C` dans le terminal, puis `docker compose down`
si vous voulez aussi supprimer les conteneurs.

> **Note** : ce mode est destiné au test et à l'évaluation. Pour le développement
> avec rechargement à chaud, voir la section suivante.

---

## 🛠️ Installation pour développement (sans Docker)

**Pour contribuer au code** ou modifier la plateforme avec rechargement à chaud,
installez Node.js et PostgreSQL nativement. Convient à toutes les plateformes.

### Prérequis

- [Node.js](https://nodejs.org/) **20** ou supérieur ([vérifier](https://nodejs.org/en/download/) : `node --version`)
- [PostgreSQL](https://www.postgresql.org/download/) **14** ou supérieur, en cours d'exécution
- [npm](https://www.npmjs.com/) (livré avec Node.js)
- [Git](https://git-scm.com/downloads/)

### Cloner le dépôt

```bash
git clone https://github.com/mindcraft-research/mindcraft.git
cd mindcraft
```

### Installer le backend

> **Sous Windows** : utilisez **Git Bash** (livré avec Git) ou **PowerShell**.
> Évitez l'invite de commandes historique (`cmd.exe`) où la commande `cp`
> n'existe pas — utilisez alors `copy` à sa place.

```bash
cd backend
cp .env.example .env       # puis ouvrez .env et configurez DATABASE_URL, JWT_SECRET…
npm install
npx prisma db push         # crée les tables dans votre base PostgreSQL
npm run dev                # démarre l'API sur http://localhost:3002
```

### Installer le frontend (dans un second terminal)

```bash
cd frontend
cp .env.example .env.local # contient NEXT_PUBLIC_API_URL=http://localhost:3002
npm install
npm run dev                # démarre l'interface sur http://localhost:3000
```

### Lancer les tests automatisés

```bash
cd backend
npm test                   # exécute la suite Vitest (9 tests d'intégration)
```

---

## 🏗️ Architecture & déploiement

### Vue d'ensemble

```
                      ┌──────────────────────────┐
   Navigateur ────►   │  Frontend Next.js        │  port 3000
   (participant /     │  (SSR + CSR)             │
    chercheur)        └──────────────┬───────────┘
                                     │ REST + JWT
                                     ▼
                      ┌──────────────────────────┐
                      │  Backend Fastify         │  port 3002
                      │  (auth, études, export)  │
                      └──────────────┬───────────┘
                                     │ Prisma ORM
                                     ▼
                      ┌──────────────────────────┐
                      │  PostgreSQL              │  port 5432
                      │  (données + métadonnées) │
                      └──────────────────────────┘
```

### Pipeline CI/CD (GitHub Actions)

À chaque `git push` sur la branche `main`, le pipeline `.github/workflows/ci.yml`
exécute automatiquement quatre étapes :

1. **Tests** — Vitest sur le backend (`backend-test`), build de production
   Next.js sur le frontend (`frontend-build`).
2. **Build Docker** — Construction des images depuis `backend/Dockerfile` et
   `frontend/Dockerfile` (multi-stage, base Debian slim).
3. **Push registre** — Envoi des images sur le Scaleway Container Registry
   (`rg.fr-par.scw.cloud/mindcraft-research/`).
4. **Déploiement** — Redémarrage des conteneurs serverless sur Scaleway
   (région `fr-par`). Health check, puis basculement du trafic.

Les Dockerfiles sont donc **utilisés en production à chaque déploiement** —
la même image qui tourne en `docker compose up` chez vous est, à un build près,
celle qui sert <https://www.mindcraft-research.fr>.

### Auto-héberger sa propre instance

Toute institution peut auto-héberger MindCraft sur ses propres serveurs.
La méthode la plus simple :

1. Cloner le dépôt sur le serveur cible.
2. Renseigner les variables d'environnement (`POSTGRES_PASSWORD`, `JWT_SECRET`,
   `RESEND_API_KEY`, etc.) dans un fichier `.env` à la racine.
3. Lancer `docker compose up -d` (mode détaché).
4. Configurer un reverse proxy HTTPS (Nginx, Caddy, Traefik) devant le port 3000.

L'instance auto-hébergée est **strictement équivalente** à l'instance officielle
sur le plan technique — seules les CGU diffèrent (votre instance, vos règles).
La licence AGPL impose néanmoins de publier les modifications du code source
si vous le déployez en service en ligne.

---

## Architecture du dépôt

```
mindcraft/
├── backend/              # API Fastify + Prisma + PostgreSQL
│   ├── Dockerfile        # image de production (multi-stage, Debian slim)
│   ├── prisma/           # schéma et migrations
│   ├── scripts/          # scripts utilitaires (seed, etc.)
│   └── src/
│       ├── routes/       # auth, études, design, export, stimulus, media
│       ├── lib/          # helpers (création d'étude de démo, email, etc.)
│       └── plugins/      # plugin Prisma
├── frontend/             # Next.js + React
│   ├── Dockerfile        # image de production (multi-stage, Debian slim)
│   └── src/
│       ├── pages/        # routes (dashboard, auth, studies, docs, settings)
│       ├── components/
│       │   ├── builder/  # constructeur d'études
│       │   ├── runner/   # moteur de passation
│       │   └── stimulus/ # moteur de tâches expérimentales
│       └── lib/          # client API, store d'auth, pont LSL
├── docker-compose.yml    # orchestration locale (db + backend + frontend)
├── examples/             # exemples et template du format d'export JSON
├── docs/                 # documentation technique et spécifications
└── .github/workflows/    # CI/CD (tests, build, push registry, deploy)
```

---

## Conception

MindCraft a été conçue et développée par **Dayle DAVID, PhD**, enseignante-chercheuse
en psychologie sociale (Université Rennes 2 / LP3C).

Le développement a été assisté par **Claude Code** (Anthropic), qui a permis à
une chercheuse en SHS sans formation initiale en informatique de produire un
outil d'envergure servant aujourd'hui sa propre communauté. L'architecture, les
choix fonctionnels et le contenu scientifique relèvent de la responsabilité
exclusive de l'auteure. La publication du code en open source permet désormais
à la communauté de contribuer, auditer et faire évoluer la plateforme.

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
