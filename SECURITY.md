# Politique de sécurité

## Versions supportées

Seule la branche `main` reçoit des correctifs de sécurité.
Les anciennes *releases* ne sont pas maintenues.

## Signaler une faille

**Merci de ne pas ouvrir d'issue publique pour signaler une faille de
sécurité.** Une issue publique exposerait la vulnérabilité avant
qu'elle ne soit corrigée et mettrait les utilisateurs en danger.

Préférez l'une des deux voies confidentielles :

1. **Email** — écrivez à
   [contact@mindcraft-research.fr](mailto:contact@mindcraft-research.fr)
   avec autant de détails que possible :
   - description de la faille,
   - étapes pour la reproduire,
   - impact estimé,
   - votre identité (optionnelle, pour le crédit éventuel).

2. **GitHub Security Advisory** — depuis le dépôt, onglet
   **Security → Report a vulnerability**. GitHub permet
   d'échanger en privé avec les mainteneurs.

## Délais de réponse

| Étape                                        | Délai cible       |
|----------------------------------------------|-------------------|
| Accusé de réception                          | 72 h ouvrées      |
| Première analyse et niveau de gravité estimé | 7 jours           |
| Correctif livré (selon la gravité)           | 7 à 90 jours      |
| Divulgation coordonnée                       | après correctif   |

## Périmètre

Sont concernées : les vulnérabilités affectant le code source de
MindCraft (backend Fastify, frontend Next.js, schéma Prisma,
workflows CI). Le service hébergé sur
[mindcraft-research.fr](https://www.mindcraft-research.fr) est
également couvert.

Sont **hors périmètre** :
- les failles dans des dépendances tierces non liées à MindCraft
  (signalez-les directement à l'éditeur de la dépendance) ;
- les attaques par déni de service distribué (DDoS) ;
- l'ingénierie sociale ;
- les rapports de scanners automatiques sans démonstration
  d'exploitabilité.

## Reconnaissance

Sauf demande contraire, les personnes ayant signalé une faille
valide sont remerciées dans les notes de version. MindCraft est un
projet de recherche académique sans programme de *bug bounty*
financier.

Merci de contribuer à la sécurité de MindCraft 🙏
