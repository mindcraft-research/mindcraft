# Rapport d'analyse — Benchmark de précision temporelle MindCraft

Conforme à la méthodologie pré-spécifiée [`docs/timing-validation/01-methodology.md`](../01-methodology.md), section 4.6.

Généré par `04-analysis.R` le 2026-06-05 21:29:22 CEST.

---

## 1. Configuration du run

| Champ | Valeur |
|---|---|
| MindCraft version | 0.1.0 |
| Git SHA | 414251a |
| OS | Windows 11 Professionnel 25H2 |
| Browser | Chrome 149.0.7827.53 |
| Refresh rate (Hz) | 60 |
| platform | Win32 |
| cpu_cores | 28 |
| device_memory_gb | 32 |
| screen_width_px | 1920 |
| screen_height_px | 1080 |
| device_pixel_ratio | 1 |
| timezone | Europe/Paris |
| total_trials | 600 |
| duration_ms | 919337.1000000238 |
| timestamp_iso | 2026-06-05T18:37:36.762Z |

## 2. Qualité du run

- Essais totaux : **600**
- Essais exclus : **0** (0.00 %)
- Run cassé selon méthodo (> 5 % exclus) ? **Non ✅**

### Frames perdues — comparaison v1.0 vs v2.0 (transparence pré-spécifiée)

Conformément à la justification du passage v1.x → v2.0 (cf. méthodologie), le script présente ici les deux verdicts. Le seuil v1.0 (> 33 ms) confondait le comportement normal du double `requestAnimationFrame` avec un vrai frame drop ; le seuil v2.0 (> 50 ms = 3 frames+) est techniquement correct.

| Seuil | Pourcentage d'essais dépassant le seuil | Verdict |
|---|---|---|
| v1.0 — > 33 ms (>2 frames, **ancien seuil mal calibré**) | 9.83 % | NE PASSE PAS |
| v2.0 — > 50 ms (>3 frames, **seuil corrigé**) | 0.00 % | PASSE (cible) |

**Le verdict global ci-dessous (section 6) utilise le seuil v2.0**, qui est techniquement correct vu l'architecture du moteur (double rAF, méthodo 4.0). Le verdict v1.0 est rapporté pour transparence uniquement.

## 3. Présentation du stimulus

**Métrique** : `t_stim_painted - t_stim_requested` (lag entre demande JavaScript et paint à l'écran via double `requestAnimationFrame`).

- **n = 600** ; moyenne **23.04** [IC 95 % 22.48 ; 23.61] ; SD **7.14** [IC 95 % 6.95 ; 7.29] ; médiane 18.00 [IQR 17.30–31.80] ; min 15.40, max 34.60
  - Seuil moyenne : acceptable ≤ 30.0 ms, cible ≤ 10.0 ms → **PASSE (acceptable)** (test sur borne sup IC 95 % = 23.61)
  - Seuil SD : acceptable ≤ 20.0 ms, cible ≤ 10.0 ms → **PASSE (cible)** (test sur borne sup IC 95 % SD = 7.29)

## 4. Overhead JavaScript du handler keydown

**Métrique** : `t_keydown_handler - t_keydown_event` (décalage entre le timestamp natif de l'événement clavier et l'exécution du handler JS).

- **n = 600** ; moyenne **0.03** [IC 95 % 0.02 ; 0.03] ; SD **0.05** [IC 95 % 0.04 ; 0.05] ; médiane 0.00 [IQR 0.00–0.10] ; min 0.00, max 0.30

*Note : cette métrique mesure l'overhead JS pur côté MindCraft (post-réception de l'événement). Pas de seuil pré-spécifié — c'est une mesure descriptive complémentaire.*

## 5. Biais du RT mesuré par rapport à la cible (par condition)

**Métrique** : `rt_measured_ms - condition_target_rt_ms` (combine l'imprécision du robot `setTimeout` et l'overhead de mesure côté plateforme).

### Condition RT cible = 200 ms

- **n = 200** ; moyenne **6.48** [IC 95 % 5.50 ; 7.46] ; SD **7.11** [IC 95 % 6.78 ; 7.31] ; médiane 1.65 [IQR 0.60–15.50] ; min 0.10, max 16.40
  - Seuil moyenne : acceptable ≤ 100.0 ms, cible ≤ 50.0 ms → **PASSE (cible)** (test sur borne sup IC 95 % = 7.46)
  - Seuil SD : acceptable ≤ 20.0 ms, cible ≤ 10.0 ms → **PASSE (cible)** (test sur borne sup IC 95 % SD = 7.31)

### Condition RT cible = 500 ms

- **n = 200** ; moyenne **6.30** [IC 95 % 5.33 ; 7.28] ; SD **7.06** [IC 95 % 6.70 ; 7.28] ; médiane 1.55 [IQR 0.70–15.40] ; min 0.10, max 16.60
  - Seuil moyenne : acceptable ≤ 100.0 ms, cible ≤ 50.0 ms → **PASSE (cible)** (test sur borne sup IC 95 % = 7.28)
  - Seuil SD : acceptable ≤ 20.0 ms, cible ≤ 10.0 ms → **PASSE (cible)** (test sur borne sup IC 95 % SD = 7.28)

### Condition RT cible = 800 ms

- **n = 200** ; moyenne **6.66** [IC 95 % 5.72 ; 7.66] ; SD **7.05** [IC 95 % 6.75 ; 7.25] ; médiane 1.65 [IQR 0.67–15.43] ; min 0.10, max 16.50
  - Seuil moyenne : acceptable ≤ 100.0 ms, cible ≤ 50.0 ms → **PASSE (cible)** (test sur borne sup IC 95 % = 7.66)
  - Seuil SD : acceptable ≤ 20.0 ms, cible ≤ 10.0 ms → **PASSE (cible)** (test sur borne sup IC 95 % SD = 7.25)

## 6. Verdict global (selon méthodologie v2.0)

Conformément à la méthodologie v2.0, ce verdict utilise les seuils corrigés (cf. encadré « Justification du passage v1 → v2 » dans la méthodo). Le verdict v1.0 (qui aurait conclu « NON CONFORME » à cause d'un seuil de frame drops mal calibré) est rappelé en section 2 ci-dessus pour transparence pré-spécifiée.

### ✅ CONFORME AUX STANDARDS WEB

Toutes les métriques sont dans la zone *acceptable* (cohérente avec la borne haute de la littérature publiée pour jsPsych).

## 7. Limites rappelées

- Ce benchmark mesure uniquement la précision **logicielle** (pipeline JS+DOM). La chaîne hardware complète (écran → photodiode → appui mécanique) n'est pas validée. Une validation hardware avec Black Box Toolkit ou photodiode + Arduino reste nécessaire pour les paradigmes ultra-sensibles.
- Configuration unique testée : Windows 11 + Chrome. Les résultats ne se généralisent pas automatiquement à macOS/Safari ou autres combinaisons.
- La comparaison avec la littérature jsPsych est asymétrique : leurs chiffres incluent l'overhead hardware (mesuré avec BBTK), les nôtres non. Affirmation autorisée : « overhead logiciel comparable ». Affirmation NON autorisée : « précision temporelle équivalente ».

---

*Rapport généré automatiquement par `04-analysis.R` à partir du CSV brut. Aucune analyse non pré-spécifiée n'a été menée. Méthodologie : [`01-methodology.md`](../01-methodology.md).*
