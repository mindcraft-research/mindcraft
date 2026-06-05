# Données brutes du benchmark de précision temporelle

Toutes les exécutions du benchmark sont archivées ici sous forme de CSV horodatés. Le contenu suit le format défini par le moteur (`frontend/src/lib/timing-benchmark/csv.js`) :
- En-tête de métadonnées préfixée `#` (config hardware, version testée, métadonnées de run)
- 1 ligne par essai dans la zone CSV (16 colonnes, incluant les essais exclus)

## Convention de nommage

`AAAA-MM-JJ_<contexte>_<os-browser>.csv`

Exemple : `2026-06-05_full-run-200trials_win11-chrome149.csv`

Le préfixe date facilite le tri chronologique. Le contexte (mini-test vs full-run, ou autre) permet de distinguer rapidement les usages. L'OS+browser facilite le filtrage quand plusieurs configs seront comparées.

## Inventaire actuel

| Fichier | Date | Contexte | Config | Notes |
|---|---|---|---|---|
| `2026-06-05_mini-test-10trials_win11-chrome149.csv` | 2026-06-05 | Validation du flow (10 essais/condition) | Windows 11 Pro 25H2 + Chrome 149.0.7827.53, écran 60 Hz | Mini-test de validation initiale. 1 essai exclu sur 30 (`tab_lost_focus`, probablement une notification système). Suffisant pour valider que le moteur fonctionne, mais N trop faible pour des stats fiables. |
| `2026-06-05_full-run-200trials_win11-chrome149.csv` | 2026-06-05 | Run officiel (200 essais/condition = 600 totaux) | Windows 11 Pro 25H2 + Chrome 149.0.7827.53, écran 60 Hz, navigation privée, performance élevée, mise en veille désactivée | **0 essai exclu sur 600**. SHA Git testé : `414251a`. Premier run propre — données utilisables pour le rapport scientifique. Le champ Notes contient des sauts de ligne qui cassent le parsing CSV strict (bug corrigé dans une PR ultérieure) — le script R `04-analysis.R` parse correctement quand même. |

## Reproductibilité

Chaque CSV contient toute l'information nécessaire pour relancer une exécution identique :
- Version de MindCraft testée (champ `MindCraft version`)
- SHA Git précis du commit testé (champ `Git SHA`)
- Configuration matérielle et logicielle complète

Pour analyser un de ces fichiers :
1. Adapter `csv_path` en haut de `../04-analysis.R`
2. Sourcer le script dans R
3. Le rapport correspondant est généré sous `../05-reports/` (à créer la première fois)

## Engagement de pérennité

Ces données sont archivées **indéfiniment** dans le dépôt Git public de MindCraft (licence AGPL-3.0). Un miroir Zenodo avec DOI sera créé au moment de la finalisation du premier rapport scientifique (voir section 7.4 de la méthodologie).
