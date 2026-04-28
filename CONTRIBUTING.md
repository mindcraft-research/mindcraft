# Contribuer à MindCraft

Merci de l'intérêt que vous portez à MindCraft ! Toute contribution
est bienvenue : signalements de bugs, suggestions, traductions,
amélioration du code, de la documentation ou des exemples.

## Signaler un bug

1. Vérifiez d'abord que le bug n'a pas déjà été signalé dans les
   [issues ouvertes](https://github.com/mindcraft-research/mindcraft/issues).
2. Ouvrez une nouvelle issue avec :
   - une description claire du problème ;
   - les étapes pour le reproduire ;
   - le comportement attendu vs observé ;
   - votre navigateur / OS / version si pertinent ;
   - une capture d'écran si applicable.

## Proposer une fonctionnalité

Ouvrez une issue avec le label `enhancement` en décrivant :

- le besoin scientifique ou pédagogique auquel la fonctionnalité répond ;
- une proposition d'interface (texte ou maquette) ;
- les cas d'usage envisagés.

Avant d'investir du temps dans une PR de grande ampleur, merci de
discuter d'abord de la proposition dans une issue, pour s'assurer
qu'elle s'inscrit bien dans la trajectoire du projet.

## Proposer une pull request

1. **Forkez** le dépôt vers votre propre compte GitHub
   (bouton « Fork » en haut à droite).
2. Clonez **votre fork** localement, puis créez une branche
   depuis `main` :
   ```bash
   git clone https://github.com/<votre-pseudo>/mindcraft.git
   cd mindcraft
   git checkout -b feat/ma-fonctionnalite
   ```
3. Suivez les conventions de code existantes (style, nommage,
   organisation des fichiers).
4. Lancez les tests localement avant de proposer la PR :
   ```bash
   cd backend && npm test
   ```
5. Rédigez un message de commit clair, en français ou en anglais,
   décrivant le **pourquoi** plus que le **quoi**.
6. Poussez votre branche **sur votre fork** (jamais directement
   sur le dépôt officiel — vous n'avez pas les droits pour, et
   c'est volontaire) :
   ```bash
   git push origin feat/ma-fonctionnalite
   ```
7. Ouvrez la **Pull Request** depuis votre fork vers la branche
   `main` du dépôt officiel `mindcraft-research/mindcraft`, avec
   une description listant les changements et, le cas échéant,
   les issues qu'elle ferme.

## Qui peut merger sur `main` ?

La branche `main` est **protégée**. Personne ne peut y pousser
directement, pas même la mainteneuse principale. Toute modification
passe obligatoirement par une Pull Request, qui doit :

- être approuvée par au moins une mainteneuse du projet ;
- avoir tous les tests d'intégration continue (CI) au vert ;
- être à jour avec `main` au moment du merge.

Seules les **mainteneuses désignées** ont le droit de cliquer sur
« Merge » une fois ces conditions remplies. Cela garantit que :

- aucune modification non revue ne se retrouve dans la version
  publique de la plateforme ;
- la traçabilité scientifique du code est préservée
  (chaque changement est lié à une PR documentée) ;
- la cohérence avec les obligations RGPD et éthiques du projet
  est vérifiée à chaque merge.

Si vous souhaitez devenir mainteneur·euse, contactez-nous après
plusieurs contributions acceptées : c'est une discussion ouverte.

## Style de code

- Pas de configuration ESLint/Prettier stricte imposée pour le moment ;
  alignez-vous simplement sur le style des fichiers existants.
- Indentation : 2 espaces.
- Privilégiez la lisibilité aux astuces de concision.
- Les commentaires sont les bienvenus, en français de préférence.

## Licence des contributions

En soumettant une pull request, vous acceptez que votre contribution
soit publiée sous la licence du projet, à savoir
**GNU Affero General Public License v3.0 ou ultérieure**
(`AGPL-3.0-or-later`). Voir le fichier [`LICENSE`](./LICENSE).

Aucune cession de droits exclusive n'est demandée : vous restez
titulaire des droits sur votre contribution. Si vous contribuez dans
le cadre de votre emploi, assurez-vous d'en avoir l'autorisation.

> **Note pour les contributions à venir** : à mesure que le projet
> grandira, il est possible que MindCraft adopte un *Contributor
> License Agreement* (CLA) léger, géré automatiquement via
> [CLA Assistant](https://cla-assistant.io/), afin de préserver une
> flexibilité juridique future (relicensing, double licence,
> compatibilité avec d'autres licences libres). Le cas échéant, un
> bot vous le signalera lors de votre première PR ; il n'y aura
> aucun changement rétroactif sur vos contributions antérieures.

## Code de conduite

Soyez bienveillant·e, respectueux·se, constructif·ve. Les échanges
techniques se déroulent en français ou en anglais. Toute attaque
personnelle, propos discriminatoire ou comportement nuisant à la
communauté entraînera la suppression de l'intervention et, en cas
de récidive, le retrait des droits de contribution.

## Questions, contact

Pour toute question qui ne rentre pas dans le cadre des issues
publiques (sécurité, partenariat, presse…), vous pouvez écrire à
**contact@mindcraft-research.fr**.

Merci pour votre aide 🙏
