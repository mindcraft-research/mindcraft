# MindCraft

**La plateforme de recherche expérimentale tout-en-un.**

Questionnaires · Tâches expérimentales · Mesures physiologiques · Open Science

---

## Présentation

MindCraft est une plateforme académique gratuite dédiée à la conception, la collecte et l'analyse de données expérimentales en psychologie et en sciences comportementales.

- **35+ types de questions** : choix unique/multiple, échelles, matrices, classement, glisser-déposer, calcul automatique, et plus
- **Tâches expérimentales** : catégorisation, temps de réaction, stimuli texte/image/audio/vidéo
- **Mesures physiologiques** : horodatage sub-milliseconde, marqueurs LSL pour EEG/ECG/eye-tracking
- **Design expérimental** : plans intersujets, intrasujets et mixtes avec contrebalancement automatique
- **Open Science** : métadonnées OSF, pré-enregistrement, codebook PDF automatique
- **RGPD** : données hébergées en France, consentement intégré
- **Collaboratif** : gestion d'équipes avec rôles

## Architecture

```
mindcraft/
├── backend/          # API Fastify + Prisma + PostgreSQL
│   ├── src/
│   │   ├── routes/   # Auth, études, design, export, stimulus, media
│   │   ├── lib/      # Helpers (demo study, etc.)
│   │   └── plugins/  # Prisma plugin
│   ├── prisma/       # Schéma et migrations
│   ├── scripts/      # Scripts utilitaires
│   └── uploads/      # Fichiers uploadés (non versionné)
├── frontend/         # Next.js 14 + React 18
│   ├── src/
│   │   ├── pages/    # Routes (dashboard, auth, studies, docs, settings)
│   │   ├── components/
│   │   │   ├── builder/   # Constructeur d'études
│   │   │   ├── runner/    # Moteur de passation
│   │   │   └── stimulus/  # Moteur de tâches expérimentales
│   │   ├── lib/      # API client, auth store, LSL bridge
│   │   └── styles/   # Tokens CSS globaux
│   └── public/
└── docs/             # Scripts relay LSL
```

## Installation

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Backend

```bash
cd backend
cp .env.example .env    # Configurer les variables d'environnement
npm install
npx prisma db push      # Créer les tables
npm run dev             # Démarre sur http://localhost:3002
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev             # Démarre sur http://localhost:3000
```

## Conception

MindCraft a été conçu et développé par **Dr. Dayle DAVID**, Maîtresse de conférences en psychologie sociale.

Développé avec l'assistance de **Claude Code** (Anthropic). L'architecture, les choix fonctionnels et le contenu scientifique relèvent de la responsabilité exclusive du concepteur humain.

## Licence

Usage académique non commercial uniquement. Voir les [Termes et Conditions](https://mindcraft-research.fr/terms).

## Contact

contact@mindcraft-research.fr
