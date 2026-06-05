# Validation de la précision temporelle de MindCraft — Méthodologie

**Version du document :** 2.0 — révision majeure après le premier run réel (correction d'un seuil mal calibré, cf. encadré « Justification du passage v1 → v2 » plus bas).
Versions antérieures :
- v1.0 — rédigée avant toute exécution du benchmark
- v1.1 — patch mineur : précise le langage du script d'analyse (R au lieu de Python générique), sans modifier les seuils, métriques ou critères d'analyse.
**Auteure :** Dayle David (Université Rennes 2, ORCID 0000-0002-4315-1058)
**Version de MindCraft testée :** à renseigner au moment du benchmark (suivra `lib/citation.js`)
**Statut :** méthodologie pré-spécifiée — engagements pris **avant** d'observer les résultats.

### Versionnement du présent document

Ce document suit le **versionnement sémantique** :
- **v1.0** — version initiale, pré-spécifiée avant toute mesure (commit horodaté Git)
- **v1.x** (1.1, 1.2…) — corrections mineures n'affectant pas les seuils, métriques ou critères d'exclusion (ex : coquilles, reformulations, ajout de précisions)
- **v2.0+** — modification majeure des seuils, du protocole ou des critères d'analyse. **Toute version v2+ doit être justifiée par écrit** dans le document, doit citer la v1.0 originale, et le rapport final doit présenter les résultats sous les **deux versions** (la pré-spécifiée et la révisée) pour permettre au lecteur de juger de l'impact de la modification.

L'historique complet des versions est consultable via `git log docs/timing-validation/01-methodology.md`.

---

### 📋 Justification du passage v1.x → v2.0 (correction d'un seuil mal calibré)

Cette section a été ajoutée **après** le premier run réel (commit `414251a`, run du 5 juin 2026), suite à la découverte d'une **erreur de calibration** d'un seuil pré-spécifié. Elle est rédigée pour être compréhensible par un lectorat non spécialiste.

#### 🎬 Comment fonctionne l'affichage à l'écran (en très simplifié)

Imagine un écran comme un livre animé (« flipbook »). Un écran à 60 Hz affiche **60 images par seconde**, soit une nouvelle image toutes les **16,67 millisecondes** (1/60 de seconde).

Quand le code de MindCraft dit au navigateur « affiche le stimulus maintenant », le navigateur **ne peut pas réagir instantanément** : il doit attendre la prochaine « page » du flipbook, c'est-à-dire le prochain rafraîchissement d'écran. Cette attente vaut entre 0 et 16,67 ms selon le moment où la demande tombe.

#### 🔍 Le « double rAF » : une sécurité standard mais coûteuse en temps

Pour s'assurer que l'image est **VRAIMENT** affichée (et non simplement préparée par le navigateur), MindCraft demande au navigateur d'attendre **deux** rafraîchissements successifs au lieu d'un seul. C'est une technique standard dans la littérature de benchmark web (Anwyl-Irvine et al., 2021), appelée *double `requestAnimationFrame`*.

**Conséquence directe :** avec cette technique, un stimulus affiché « parfaitement normalement » prend toujours **entre 1 et 2 rafraîchissements** (soit 17 à 33 ms à 60 Hz). Ce n'est pas un problème, c'est juste comment la mécanique fonctionne.

#### ❌ L'erreur de calibration en v1.0

Dans la version v1.0 de la méthodologie, j'avais défini une « frame perdue » comme tout délai d'affichage supérieur à **33 ms** (« plus de 2 frames »). Mais comme expliqué ci-dessus, **17-33 ms est précisément la zone normale attendue** avec un double rAF. Mon seuil confondait donc « comportement normal de la technique de mesure » avec « vrai problème de l'ordinateur ».

Conséquence sur le premier run : le rapport a signalé **9,83 % de « frames perdues »** — un chiffre qui faisait basculer le verdict global en « non conforme ». En réalité, 99 % de ces « frames perdues » étaient juste des essais où le double rAF a pris 2 rafraîchissements au lieu de 1, ce qui est attendu.

#### ✅ La correction en v2.0

Le seuil de détection d'une vraie frame perdue est rehaussé à **> 50 ms (= 3 frames ou plus)** :
- **< 50 ms** : le navigateur a affiché dans la fenêtre temporelle normale du double rAF — pas de problème.
- **50-100 ms** : le navigateur a pris 3 à 6 frames — c'est un ralentissement réel mais modéré.
- **> 100 ms** : déjà classé comme « frame drop sévère » et provoque l'exclusion de l'essai (cf. section 4.7, inchangé).

Tous les autres seuils restent **identiques à la v1.0**. Aucun changement n'a été apporté au protocole, au nombre d'essais, aux conditions ni au plan d'analyse.

#### 🎯 Engagement de transparence

Le script d'analyse R (v2.0) calcule désormais les **deux** verdicts :
1. Le verdict selon la métrique v1.0 (seuil > 33 ms) — pour montrer ce qu'on aurait conclu avec la méthodo originale, faussement non conforme à cause de l'erreur de calibration
2. Le verdict selon la métrique v2.0 (seuil > 50 ms) — la conclusion réelle, qui reflète le vrai fonctionnement de MindCraft

Le rapport final présente donc les **deux résultats côte à côte**, conformément à l'engagement de transparence figé dans la section Versionnement ci-dessus. Le lecteur peut juger de l'impact de la modification par lui-même.

#### 📌 À noter

Cette correction est l'**exemple parfait du fonctionnement attendu** du système de pré-spécification + transparence :
1. La méthodo v1.0 a été figée AVANT toute mesure
2. Le run a révélé un défaut dans la méthodo (pas dans le logiciel testé)
3. Le défaut est documenté publiquement et corrigé en v2.0 avec justification écrite
4. Le rapport présente les deux versions pour que rien ne soit caché

Si à la place j'avais discrètement modifié le seuil dans la méthodo sans le mentionner, ou si j'avais re-lancé le run jusqu'à obtenir « conforme » sans documenter, cela aurait été du **cherry-picking** — la dérive précisément que la pré-spécification vise à empêcher.

---

## 1. Objectif

Évaluer la précision temporelle de MindCraft sur les deux dimensions critiques pour les tâches comportementales chronométriques :

1. **Présentation des stimuli** — entre le moment où JavaScript demande l'affichage d'un stimulus et le moment où ce stimulus est effectivement peint à l'écran.
2. **Mesure du temps de réaction (RT)** — entre le moment où le participant produit une réponse (touche clavier) et le moment où MindCraft enregistre l'horodatage de cette réponse.

Le but est de vérifier que MindCraft atteint des performances **comparables** à celles documentées pour les outils de référence du domaine, notamment **jsPsych** (autre plateforme web pour expérimentations comportementales, largement validée dans la littérature).

## 2. Périmètre — ce que ce benchmark mesure et ne mesure pas

### ✅ Ce qui est mesuré
- La précision **logicielle** de MindCraft : overhead du runtime JavaScript, du pipeline de rendu du navigateur, du moteur d'événements DOM.
- La **stabilité** de cette précision sur un grand nombre d'essais.
- La **comparabilité** avec les benchmarks publiés de jsPsych.

### ❌ Ce qui n'est PAS mesuré
- La **chaîne matérielle complète** (photon sur l'écran → appui mécanique du doigt) nécessite un dispositif physique (BlackBoxToolkit, photodiode + Arduino). Ce benchmark **ne remplace pas** une validation hardware.
- La **précision de présentation audio** (latence ASIO, DirectSound, etc.) — sera testée séparément si nécessaire.
- Les **variations entre navigateurs / OS / hardware** — un benchmark séparé multi-config sera conduit après celui-ci.

Le présent document décrit donc une **borne supérieure de précision logicielle** dans une configuration matérielle donnée, qui est la condition nécessaire (mais pas suffisante) pour atteindre la précision visée en conditions réelles.

## 3. Cadre théorique et seuils de référence

### 3.1 Performances rapportées pour les plateformes web validées (chiffres vérifiés sur sources primaires)

Les seuils ci-dessous sont dérivés des **chiffres exacts** publiés pour jsPsych dans les deux études de référence du domaine. Chaque valeur a été vérifiée sur le texte intégral en accès ouvert (PubMed Central). Les autres plateformes (Gorilla, lab.js, PsychoJS) sont citées en comparaison mais ne servent pas de base aux seuils, MindCraft étant une stack web JavaScript dont l'architecture est plus proche de jsPsych.

**Performances de jsPsych mesurées avec Black Box Toolkit (photodiode + actuateur mécanique) :**

| Métrique | Anwyl-Irvine et al. (2021), Table 1 et 2 | Bridges et al. (2020), Table 3 |
|---|---|---|
| Biais de présentation visuelle (moyenne) | **26.02 ms** | **3.6 ms** (Windows 10 / Chrome) |
| SD de présentation visuelle | **17.40 ms** | **5.1 ms** (Windows 10 / Chrome) |
| Biais de RT mesuré (sur-estimation moyenne) | **87.40 ms** | **23.27 ms** (Windows 10 / Chrome) |
| SD du RT mesuré | **15.27 ms** | **7.85 ms** (Windows 10 / Chrome) |

L'écart important entre les deux études reflète la **diversité des configurations testées** : Bridges et al. (2020) utilisent des configurations représentatives optimales (PC moderne, browser récent, conditions de laboratoire), tandis que Anwyl-Irvine et al. (2021) testent un éventail plus large de combinaisons OS × browser × hardware reflétant la diversité réelle des participants en ligne.

**Cas particulier macOS + Safari** — Pronk et al. (2020), Table 4, mesurent un biais de RT de **132.9 ms (SD 8.1)** pour macOS/Safari, soit l'overhead le plus élevé documenté pour une plateforme web. Cette configuration constitue l'exception haute du marché.

**Cas plus ancien pour contexte historique** — Reimers & Stewart (2015), Tables 6 et suivantes, mesuraient sur du hardware Windows ancien (Dell OptiPlex 760) un biais de présentation de **25.0 ms (SD 8.6)** pour une durée demandée de 150 ms, et un biais de RT de **42.8 ms (SD 6.7)** à 300 ms cible sur Firefox.

### 3.2 Seuils d'acceptation pour MindCraft

**Pré-spécifiés AVANT l'exécution du benchmark.** La fourchette observée dans la littérature pour jsPsych va de ~4 ms à ~26 ms pour le biais de présentation, et de ~23 ms à ~87 ms pour le biais de RT. Les seuils ci-dessous prennent en compte cette amplitude réelle, sans optimisme excessif ni laxisme.

| Métrique | Seuil **acceptable** (cohérent avec la borne haute de la littérature) | Seuil **cible** (cohérent avec la borne basse) |
|---|---|---|
| Biais de présentation moyen | ≤ 30 ms (≈ Anwyl-Irvine 2021, jsPsych) | ≤ 10 ms (≈ Bridges 2020, jsPsych en config optimale) |
| Variabilité de présentation (SD) | ≤ 20 ms (≈ Anwyl-Irvine 2021) | ≤ 10 ms (≈ Bridges 2020) |
| Biais de RT mesuré | ≤ 100 ms (couvre jsPsych Anwyl-Irvine 2021 et Pronk Windows Chrome 68.5 ms) | ≤ 50 ms (≈ Bridges 2020) |
| Variabilité de RT (SD) | ≤ 20 ms (≈ Anwyl-Irvine 2021) | ≤ 10 ms (≈ Bridges 2020 et Pronk Windows) |
| Pourcentage d'essais avec **vraies** frames perdues (> 50 ms = 3 frames+) — *seuil v2.0* | ≤ 1 % | ≤ 0.5 % |

⚠️ Le seuil de la dernière ligne a été corrigé en v2.0 (passage de « > 33 ms » à « > 50 ms »). Voir l'encadré « Justification du passage v1.x → v2.0 » en haut du document pour les détails et la raison technique.

**Note importante sur la configuration testée** — Les seuils ci-dessus sont valides pour des configurations Windows / Linux + Chrome / Firefox / Edge. La configuration **macOS + Safari** sera, si elle est testée, analysée séparément avec un seuil de tolérance plus élevé sur le RT (jusqu'à 150 ms), conformément à ce que Pronk et al. (2020) documentent pour cette combinaison.

**Verdict final** :
- **« Conforme aux standards web (borne haute de la littérature) »** si toutes les métriques sont dans la colonne *acceptable*.
- **« Précision web optimale (borne basse de la littérature) »** si toutes les métriques sont dans la colonne *cible*.
- **« Non conforme »** si une métrique dépasse le seuil *acceptable* — auquel cas le rapport décrira précisément le problème, sans tentative de minimisation, et listera les corrections envisagées.

## 4. Protocole expérimental

### 4.0 Spécification du stimulus utilisé

Pour assurer la reproductibilité et éviter que la complexité du contenu visuel n'affecte le temps de rendu, le stimulus utilisé pour le benchmark est volontairement minimaliste et figé :

| Propriété | Valeur |
|---|---|
| Type | Carré de couleur unie (élément `<div>` HTML) |
| Couleur | `#FFFFFF` (blanc pur) sur fond `#000000` (noir pur) — contraste maximal, pas de décodage d'image |
| Dimensions | 200 × 200 px |
| Position | Centre exact de la fenêtre (`position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`) |
| Police / texte / image / animation | Aucun — uniquement la couleur de fond change |

**Justification :** un stimulus complexe (image, texte stylisé, gradient) demande au navigateur un décodage / une mise en page qui peut prendre plusieurs ms supplémentaires et introduit une source de variabilité non liée à la précision temporelle de la plateforme. Un carré uni élimine cette source de bruit et isole la mesure du pipeline de rendu pur. Ce choix est cohérent avec la pratique des benchmarks publiés (Anwyl-Irvine et al. 2021 utilisent un changement de luminance simple ; Bridges et al. 2020 utilisent un patch noir/blanc).

### 4.1 Métriques instrumentées (timestamps capturés à chaque essai)

À l'intérieur du bloc Tâche de MindCraft, on capture les timestamps haute résolution (`performance.now()`) suivants :

| Timestamp | Définition |
|---|---|
| `t_stim_requested` | Moment où le state React qui déclenche l'affichage du stimulus est mis à jour |
| `t_stim_painted` | Premier `requestAnimationFrame` callback **après** que le DOM contenant le stimulus a été commité (mesuré via `MutationObserver` ou flag explicite) |
| `t_keydown_event` | `KeyboardEvent.timeStamp` natif (horodatage produit par le navigateur au moment de la réception OS) |
| `t_keydown_handler` | `performance.now()` à l'entrée du handler JavaScript qui traite l'événement |
| `t_response_recorded` | Moment où MindCraft enregistre définitivement la réponse (dispatcher store) |

### 4.2 Métriques dérivées

| Métrique | Calcul |
|---|---|
| **Présentation lag** | `t_stim_painted - t_stim_requested` |
| **Présentation variability** | SD de la métrique ci-dessus sur les N essais |
| **Frame drops réels** *(seuil v2.0)* | Détection : si `t_stim_painted - t_stim_requested > 50 ms` (= 3 frames+ à 60Hz, au-delà de la zone normale du double rAF qui couvre 17-33 ms). Le seuil v1.0 était à 32 ms, ce qui confondait le comportement normal du double rAF avec un vrai frame drop — cf. encadré « Justification du passage v1.x → v2.0 ». |
| **RT measurement offset** | `t_keydown_handler - t_keydown_event` (= overhead entre réception OS et traitement JS) |
| **RT total recorded** | `t_keydown_handler - t_stim_painted` (= ce que MindCraft enregistre comme RT) |
| **RT true** (mode robot uniquement) | délai programmé entre `t_stim_painted` et la simulation de keydown |
| **RT measurement error** (mode robot) | `RT total recorded - RT true` |

### 4.3 Conditions expérimentales

Le protocole s'aligne sur celui de **Reimers & Stewart (2015)** : 100 trials par condition, ITI de 500 ms, écran 60 Hz. Cette étude est la plus proche de notre setup parce qu'elle teste un seul moteur logiciel (HTML5/JavaScript) sur un parc varié de machines, sans dispositif BBTK — exactement notre situation. Bridges et al. (2020) utilisent 1000 trials, mais avec un dispositif robotisé qui automatise complètement la passation : non transposable à notre setup où la collecte est plus coûteuse à orchestrer. Anwyl-Irvine et al. (2021) montent à 4350 présentations par configuration en s'appuyant aussi sur du BBTK.

- **N = 200 essais** par condition de RT simulé. Le doublement par rapport à Reimers & Stewart améliore la précision des SD estimées sans alourdir le protocole.
- **3 conditions de RT simulé** : 200, 500, 800 ms après l'affichage du stimulus. Cette gamme couvre les paradigmes les plus courants en sciences cognitives : tâches go/no-go et flanker (RT typiques 250-450 ms), Stroop (450-700 ms), reconnaissance lexicale (500-900 ms). Le choix de 3 délais fixes (et non aléatoires) s'aligne sur Reimers & Stewart 2015 qui utilisent aussi 3 délais cibles.
- **ITI (inter-trial interval)** aléatoire entre 500 et 1500 ms, conformément aux recommandations standard en psychophysique pour éviter les patterns de timing artificiels qui pourraient biaiser les mesures.
- **Mode robot participant** : un script JavaScript déclenche un `KeyboardEvent` via `dispatchEvent` après le délai cible, mesuré à partir de `t_stim_painted`. **Cette simulation court-circuite la couche d'entrée OS / hardware** — cette limite est explicitée dans la section 8.

### 4.4 Configuration matérielle (à renseigner avant chaque run)

À documenter pour chaque exécution :
- Modèle du processeur, RAM
- OS (et version exacte)
- Navigateur (et version exacte)
- Résolution + taux de rafraîchissement de l'écran
- Autres apps lancées (idéalement aucune sauf l'OS)
- Mode énergie (haute performance recommandé)
- Date et heure d'exécution

### 4.5 Procédure d'exécution

1. Démarrage de l'environnement local via Docker Compose : `docker compose up -d`. La stack complète (PostgreSQL 16, backend Fastify, frontend Next.js) est lancée à partir de `docker-compose.yml` à la racine du dépôt. **Aucune installation Node.js sur la machine hôte n'est requise** ; la reproductibilité est assurée par les images Docker pinées.
2. Vérification que la stack est saine : `docker compose ps` doit montrer les 3 services en état `healthy`.
3. Création d'une étude de test avec un bloc Tâche contenant N essais (voir code de benchmark à l'étape 2 du projet de validation).
4. Activation du mode `__timing_benchmark__` qui :
   - Active la capture des 5 timestamps définis section 4.1
   - Active le robot participant
5. Exécution complète sans interaction humaine.
6. Export automatique des données brutes en CSV (1 ligne par essai) avec en-tête contenant la configuration hardware (section 4.4).
7. Analyse statistique avec R (script versionné dans le repo sous `docs/timing-validation/04-analysis.R`, utilisant uniquement les fonctions de base R pour limiter les dépendances).
8. Rapport généré automatiquement à partir des données brutes sous `docs/timing-validation/05-report.md`.

**Note de reproductibilité Docker** : la version exacte de chaque image Docker utilisée pour le benchmark est figée dans `docker-compose.yml` au commit de l'exécution du benchmark. Le SHA Git de ce commit est reporté dans le rapport final pour permettre à quiconque de re-checkout la configuration exacte et de relancer.

### 4.6 Plan d'analyse statistique pré-spécifié

Pour exclure tout ajustement post-hoc, les choix analytiques suivants sont fixés avant la collecte des données :

**Statistiques descriptives** :
- **Tendance centrale** : moyenne arithmétique sur les essais retenus (cf. critères d'exclusion 4.7).
- **Dispersion** : écart-type (SD) sur l'échantillon retenu, sans transformation.
- **Tendance robuste complémentaire** : médiane + intervalle interquartile (IQR) rapportée systématiquement à côté de la moyenne/SD, pour détecter d'éventuelles distributions asymétriques.

**Intervalles de confiance** :
- IC 95 % calculés par **bootstrap non paramétrique** (10 000 ré-échantillonnages avec remise). Justification : ne fait pas l'hypothèse de normalité des distributions, robuste aux outliers résiduels après exclusion.

**Test contre les seuils** :
- Pour chaque métrique, la valeur observée (moyenne et borne supérieure IC 95 % bootstrap) est comparée au seuil pré-spécifié en section 3.2. Verdict binaire « passe / ne passe pas » par métrique. Pas de test d'hypothèse formel (NHST) car l'objectif est descriptif, pas inférentiel.

**Pas d'analyses non pré-spécifiées** : toute analyse exploratoire menée après observation des résultats sera **explicitement étiquetée « exploratoire »** dans le rapport et ne sera pas utilisée pour le verdict.

### 4.7 Critères d'exclusion (essais et runs)

Tous les seuils ci-dessous sont fixés avant collecte.

**Exclusion au niveau de l'essai individuel** (l'essai est retiré du calcul mais comptabilisé dans le rapport de qualité) :
- Frame drop sévère : `t_stim_painted - t_stim_requested > 100 ms` (= plus de 6 frames ratées à 60 Hz, signal d'un blocage du thread principal).
- Onglet ayant perdu le focus pendant l'essai (détecté via `document.visibilityState` ou l'event `blur`).
- ITI réel s'écartant de la cible de plus de 50 % (ex : ITI demandé 1000 ms, mesuré 1500 ms ou plus → essai suivant exclu car probablement précédé d'un lag).
- Réponse du robot non détectée par le handler (signal d'un bug dans le mécanisme de simulation).

**Run entier considéré comme « cassé »** (à relancer, non utilisé pour le rapport) :
- Plus de **5 %** des essais exclus par les critères ci-dessus.
- Coupure réseau, mise en veille de l'ordinateur, alerte système intervenue pendant le run.
- Détection après coup d'un onglet d'arrière-plan qui aurait consommé > 10 % du CPU.

**Tous les essais exclus sont conservés dans les données brutes** (champ `excluded_reason` ajouté) — la transparence prime sur la propreté du tableau final. Le rapport indique le nombre et le pourcentage d'essais exclus par catégorie.

### 4.8 Spécification précise du robot participant

Pour assurer la reproductibilité et l'auditabilité du mécanisme de simulation, le robot participant est défini précisément :

**Mécanisme** : appel `document.dispatchEvent(new KeyboardEvent('keydown', { ... }))` exécuté après un `setTimeout` calibré sur `performance.now()` (pas sur l'horloge système, plus précise et monotone).

**Élément cible** : `document` (l'event bubble jusqu'au handler global de MindCraft, identique au comportement réel d'un clavier).

**Propriétés du KeyboardEvent** :
- `key: ' '` (touche espace, choix standard pour les tâches de RT)
- `code: 'Space'`
- `keyCode: 32` (pour compatibilité legacy si le handler l'utilise)
- `bubbles: true`, `cancelable: true`, `composed: true`

**Calibration du délai** : `setTimeout(() => dispatch(), targetRT_ms)` est démarré à `t_stim_painted`. Le délai réel est mesuré post-hoc via `performance.now()` à l'entrée du dispatch et stocké dans les données brutes. **La précision de `setTimeout` est elle-même imparfaite** (résolution typique 4 ms sur navigateurs modernes) — cette imprécision est documentée dans le rapport et soustraite si nécessaire.

**Limite assumée** : ce mécanisme court-circuite la couche d'entrée OS (driver clavier USB, file d'événements de l'OS). Le RT mesuré est donc un **minorant** de ce qu'on aurait avec un vrai clavier — l'overhead manquant est estimé entre 5 et 20 ms (USB poll rate 125 Hz → 8 ms + traitement OS).

## 5. Reproductibilité

Tous les artefacts du benchmark sont versionnés dans le dépôt MindCraft sous `docs/timing-validation/` :
- `01-methodology.md` — ce document
- `02-benchmark-code/` — code source du mode `__timing_benchmark__` et du robot participant
- `03-raw-data/` — données brutes CSV (avec config hardware en en-tête)
- `04-analysis.py` — script d'analyse
- `05-report.md` — rapport final reproductible

Toute personne avec le repo peut :
1. Lancer MindCraft localement
2. Activer le mode benchmark
3. Reproduire les chiffres du rapport sur sa propre config

## 6. Engagement de transparence

**Aucun résultat n'a été observé au moment de la rédaction de ce document.** Les métriques, les seuils et le protocole ont été figés avant toute mesure. Si les résultats observés conduisent à modifier la méthodologie a posteriori, cela sera **explicitement documenté** dans le rapport final avec :
- La modification effectuée
- La raison de la modification
- Les résultats **avant** et **après** la modification

## 7. Déclarations scientifiques

### 7.1 Conflit d'intérêts (Conflict of Interest disclosure)

L'autrice est à la fois **l'unique développeuse de MindCraft** et **l'unique validatrice** dans le cadre de ce benchmark. Ce double rôle constitue un conflit d'intérêts structurel qui est mitigé par :
- La pré-spécification publique de la méthodologie (ce document, horodaté Git avant toute exécution)
- La transparence intégrale du protocole, du code source, des données brutes et du script d'analyse (tous publiés en open source AGPL-3.0 dans le dépôt MindCraft)
- L'engagement explicite (section 6) à publier les résultats même négatifs, sans tentative d'ajustement post-hoc
- La possibilité, par construction, qu'un tiers indépendant relance le benchmark sur sa propre configuration et publie ses propres chiffres

### 7.2 Financement

Projet **auto-financé par l'autrice** (hébergement Scaleway et services associés payés sur fonds personnels). Aucun financement externe public ou privé, aucune subvention, aucun contrat de recherche n'ont contribué à ce benchmark ou au développement de MindCraft.

### 7.3 Approbation éthique

**Non applicable.** Ce benchmark n'implique aucun sujet humain — les « participants » sont des scripts JavaScript simulant des appuis clavier (cf. section 4.8). Aucune donnée personnelle n'est collectée, traitée ou publiée. Aucune approbation d'un comité d'éthique de la recherche (CER) n'est donc requise.

### 7.4 Disponibilité des données et code

Tous les artefacts sont publiés sous licence **AGPL-3.0** dans le dépôt GitHub officiel de MindCraft (`mindcraft-research/mindcraft`) :
- Méthodologie : `docs/timing-validation/01-methodology.md` (ce document)
- Code du benchmark : `docs/timing-validation/02-benchmark-code/`
- Données brutes (CSV) : `docs/timing-validation/03-raw-data/`
- Script d'analyse R : `docs/timing-validation/04-analysis.R`
- Rapport final : `docs/timing-validation/05-report.md`

**Pérennité** : un dépôt miroir sera créé sur **Zenodo** au moment de la finalisation du rapport, avec attribution d'un DOI permanent. L'archive Software Heritage de MindCraft inclura également ces artefacts (SWHID rapporté dans le rapport).

## 8. Déclaration de transparence sur l'usage d'IA

Ce document, le code du benchmark, et le rapport d'analyse ont été rédigés par **Dayle David** avec l'assistance de **Claude (Anthropic, modèle Opus 4.7, fenêtre 1M context)**, sous sa direction et sa validation.

L'autrice :
- Assume l'entière responsabilité de la méthodologie, des choix techniques, et de l'interprétation des résultats.
- A validé chaque étape (rédaction de la méthodologie, implémentation, analyse, rédaction du rapport) avant de l'intégrer.
- Engage sa responsabilité scientifique sur les conclusions du rapport final.

Le code, les données brutes et les analyses sont publiés en open source (AGPL-3.0) et reproductibles par toute personne intéressée — la validité des conclusions ne dépend donc pas de l'honnêteté de l'autrice ni de l'assistant IA utilisé, mais de la reproductibilité du protocole.

Cette déclaration suit les recommandations de transparence sur l'usage d'IA générative en recherche publiées en 2024 par *Nature*, *NeurIPS*, et le *Committee on Publication Ethics (COPE)*.

## 9. Limites assumées

1. **Test logiciel uniquement** — ne mesure pas la chaîne matérielle complète (écran → doigt). Une validation hardware avec photodiode et simulateur d'appui mécanique reste nécessaire pour les paradigmes ultra-sensibles (P300, masquage à 17 ms, etc.). Cette validation sera conduite ultérieurement si la demande émerge.
2. **Configuration unique** — un seul ordinateur dans un premier temps. Un benchmark multi-config (Windows/macOS/Linux × Chrome/Firefox/Safari) suivra dans un second document.
3. **Robot participant simulé en JavaScript** — la simulation par `dispatchEvent` court-circuite la couche OS d'entrée. Le décalage RT mesuré dans ce contexte est donc **un minorant** : avec un vrai clavier physique, on attend un overhead supplémentaire de 5-20 ms (latence USB + OS). Cette limite est documentée dans le rapport.
4. **Pas de comparaison directe avec jsPsych sur la même machine** — la comparaison se fait via les benchmarks publiés de la littérature, pas via une mesure simultanée. Une comparaison directe nécessiterait de répliquer le même paradigme sur les deux plateformes, ce qui constituerait un benchmark séparé.

5. **Comparaison asymétrique avec la littérature — limite à expliciter en conclusion** — Les chiffres de référence (Anwyl-Irvine et al. 2021, Bridges et al. 2020) ont été obtenus avec un Black Box Toolkit (photodiode mesurant le photon réellement émis par l'écran + actuateur mécanique simulant un appui physique sur un vrai clavier). Notre benchmark mesure uniquement le timing logiciel interne (`performance.now()` côté JavaScript + simulation d'événement DOM). En conséquence :
    - **Affirmation autorisée** : « L'overhead logiciel de MindCraft est comparable à l'overhead logiciel de jsPsych mesuré dans les mêmes conditions software-only. »
    - **Affirmation NON autorisée** : « MindCraft a la même précision temporelle que jsPsych. » — cette affirmation impliquerait une mesure hardware équivalente, que nous n'avons pas faite.
    - **Conséquence pratique** : pour les paradigmes ultra-sensibles (P300 EEG, masquage à 17 ms, stimuli subliminaux), il faudra mener une validation hardware dédiée avant de recommander MindCraft.
    - Cette limite sera rappelée dans la conclusion du rapport et dans toute communication scientifique s'appuyant sur ce benchmark.

## 10. Références

Les références sont listées avec leur URL d'accès libre (PMC = PubMed Central) quand elle existe, pour permettre la vérification des chiffres cités dans la section 3.

**Références principales utilisées pour dériver les seuils :**

- Anwyl-Irvine, A. L., Dalmaijer, E. S., Hodges, N., & Evershed, J. K. (2021). Realistic precision and accuracy of online experiment platforms, web browsers, and devices. *Behavior Research Methods*, 53, 1407-1425. https://doi.org/10.3758/s13428-020-01501-5 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC8367876/ *(Tables 1 et 2)*

- Bridges, D., Pitiot, A., MacAskill, M. R., & Peirce, J. W. (2020). The timing mega-study: Comparing a range of experiment generators, both lab-based and online. *PeerJ*, 8, e9414. https://doi.org/10.7717/peerj.9414 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC7512138/ *(Table 3)*

**Références complémentaires (cas particuliers et contexte historique) :**

- Pronk, T., Wiers, R. W., Molenkamp, B., & Murre, J. (2020). Mental chronometry in the pocket? Timing accuracy of web applications on touchscreen and keyboard devices. *Behavior Research Methods*, 52, 1371-1382. https://doi.org/10.3758/s13428-019-01321-2 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC7280355/ *(Table 4 — cas macOS/Safari)*

- Reimers, S., & Stewart, N. (2015). Presentation and response timing accuracy in Adobe Flash and HTML5/JavaScript Web experiments. *Behavior Research Methods*, 47, 309-327. https://doi.org/10.3758/s13428-014-0471-1 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC4427652/ *(Table 6 — protocole de référence)*

**Référence citée à titre de validation conceptuelle uniquement** (chiffres de cette étude non utilisés pour les seuils, le texte intégral n'étant pas en accès ouvert au moment de la rédaction) :

- Anwyl-Irvine, A. L., Massonnié, J., Flitton, A., Kirkham, N., & Evershed, J. K. (2020). Gorilla in our midst: An online behavioral experiment builder. *Behavior Research Methods*, 52, 388-407. https://doi.org/10.3758/s13428-019-01237-x *(démontre la réplicabilité d'effets cognitifs en ligne ; les chiffres de timing hardware sont dans la publication de 2021 ci-dessus)*
