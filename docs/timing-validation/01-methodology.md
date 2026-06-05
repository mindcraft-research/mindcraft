# Validation de la précision temporelle de MindCraft — Méthodologie

**Version du document :** 1.0 — rédigée avant toute exécution du benchmark.
**Auteure :** Dayle David (Université Rennes 2, ORCID 0000-0002-4315-1058)
**Version de MindCraft testée :** à renseigner au moment du benchmark (suivra `lib/citation.js`)
**Statut :** méthodologie pré-spécifiée — engagements pris **avant** d'observer les résultats.

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
| Pourcentage d'essais avec frames perdues | ≤ 1 % | ≤ 0.5 % |

**Note importante sur la configuration testée** — Les seuils ci-dessus sont valides pour des configurations Windows / Linux + Chrome / Firefox / Edge. La configuration **macOS + Safari** sera, si elle est testée, analysée séparément avec un seuil de tolérance plus élevé sur le RT (jusqu'à 150 ms), conformément à ce que Pronk et al. (2020) documentent pour cette combinaison.

**Verdict final** :
- **« Conforme aux standards web (borne haute de la littérature) »** si toutes les métriques sont dans la colonne *acceptable*.
- **« Précision web optimale (borne basse de la littérature) »** si toutes les métriques sont dans la colonne *cible*.
- **« Non conforme »** si une métrique dépasse le seuil *acceptable* — auquel cas le rapport décrira précisément le problème, sans tentative de minimisation, et listera les corrections envisagées.

## 4. Protocole expérimental

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
| **Frame drops** | Détection : si `t_stim_painted - t_stim_requested > 32 ms` (= 2 frames à 60Hz manquées) |
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

1. Démarrage de MindCraft en local (`npm run dev` côté frontend + backend), ou sur l'instance de production avec un mode benchmark dédié.
2. Création d'une étude de test avec un bloc Tâche contenant N essais.
3. Activation du mode `__timing_benchmark__` qui :
   - Active la capture des 5 timestamps ci-dessus
   - Active le robot participant
4. Exécution complète sans interaction humaine.
5. Export automatique des données brutes en CSV (1 ligne par essai).
6. Analyse Python (script versionné dans le repo).
7. Rapport généré automatiquement à partir des données brutes.

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

## 7. Déclaration de transparence sur l'usage d'IA

Ce document, le code du benchmark, et le rapport d'analyse ont été rédigés par **Dayle David** avec l'assistance de **Claude (Anthropic, modèle Opus 4.7, fenêtre 1M context)**, sous sa direction et sa validation.

L'autrice :
- Assume l'entière responsabilité de la méthodologie, des choix techniques, et de l'interprétation des résultats.
- A validé chaque étape (rédaction de la méthodologie, implémentation, analyse, rédaction du rapport) avant de l'intégrer.
- Engage sa responsabilité scientifique sur les conclusions du rapport final.

Le code, les données brutes et les analyses sont publiés en open source (AGPL-3.0) et reproductibles par toute personne intéressée — la validité des conclusions ne dépend donc pas de l'honnêteté de l'autrice ni de l'assistant IA utilisé, mais de la reproductibilité du protocole.

Cette déclaration suit les recommandations de transparence sur l'usage d'IA générative en recherche publiées en 2024 par *Nature*, *NeurIPS*, et le *Committee on Publication Ethics (COPE)*.

## 8. Limites assumées

1. **Test logiciel uniquement** — ne mesure pas la chaîne matérielle complète (écran → doigt). Une validation hardware avec photodiode et simulateur d'appui mécanique reste nécessaire pour les paradigmes ultra-sensibles (P300, masquage à 17 ms, etc.). Cette validation sera conduite ultérieurement si la demande émerge.
2. **Configuration unique** — un seul ordinateur dans un premier temps. Un benchmark multi-config (Windows/macOS/Linux × Chrome/Firefox/Safari) suivra dans un second document.
3. **Robot participant simulé en JavaScript** — la simulation par `dispatchEvent` court-circuite la couche OS d'entrée. Le décalage RT mesuré dans ce contexte est donc **un minorant** : avec un vrai clavier physique, on attend un overhead supplémentaire de 5-20 ms (latence USB + OS). Cette limite est documentée dans le rapport.
4. **Pas de comparaison directe avec jsPsych sur la même machine** — la comparaison se fait via les benchmarks publiés de la littérature, pas via une mesure simultanée. Une comparaison directe nécessiterait de répliquer le même paradigme sur les deux plateformes, ce qui constituerait un benchmark séparé.

## 9. Références

Les références sont listées avec leur URL d'accès libre (PMC = PubMed Central) quand elle existe, pour permettre la vérification des chiffres cités dans la section 3.

**Références principales utilisées pour dériver les seuils :**

- Anwyl-Irvine, A. L., Dalmaijer, E. S., Hodges, N., & Evershed, J. K. (2021). Realistic precision and accuracy of online experiment platforms, web browsers, and devices. *Behavior Research Methods*, 53, 1407-1425. https://doi.org/10.3758/s13428-020-01501-5 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC8367876/ *(Tables 1 et 2)*

- Bridges, D., Pitiot, A., MacAskill, M. R., & Peirce, J. W. (2020). The timing mega-study: Comparing a range of experiment generators, both lab-based and online. *PeerJ*, 8, e9414. https://doi.org/10.7717/peerj.9414 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC7512138/ *(Table 3)*

**Références complémentaires (cas particuliers et contexte historique) :**

- Pronk, T., Wiers, R. W., Molenkamp, B., & Murre, J. (2020). Mental chronometry in the pocket? Timing accuracy of web applications on touchscreen and keyboard devices. *Behavior Research Methods*, 52, 1371-1382. https://doi.org/10.3758/s13428-019-01321-2 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC7280355/ *(Table 4 — cas macOS/Safari)*

- Reimers, S., & Stewart, N. (2015). Presentation and response timing accuracy in Adobe Flash and HTML5/JavaScript Web experiments. *Behavior Research Methods*, 47, 309-327. https://doi.org/10.3758/s13428-014-0471-1 — texte intégral : https://pmc.ncbi.nlm.nih.gov/articles/PMC4427652/ *(Table 6 — protocole de référence)*

**Référence citée à titre de validation conceptuelle uniquement** (chiffres de cette étude non utilisés pour les seuils, le texte intégral n'étant pas en accès ouvert au moment de la rédaction) :

- Anwyl-Irvine, A. L., Massonnié, J., Flitton, A., Kirkham, N., & Evershed, J. K. (2020). Gorilla in our midst: An online behavioral experiment builder. *Behavior Research Methods*, 52, 388-407. https://doi.org/10.3758/s13428-019-01237-x *(démontre la réplicabilité d'effets cognitifs en ligne ; les chiffres de timing hardware sont dans la publication de 2021 ci-dessus)*
