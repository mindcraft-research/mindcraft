# =============================================================================
# Script d'analyse statistique du benchmark de précision temporelle MindCraft
# -----------------------------------------------------------------------------
# Conforme strictement à la méthodologie pré-spécifiée :
#   docs/timing-validation/01-methodology.md, section 4.6
#
# Calcule les statistiques descriptives + IC 95 % bootstrap sur les essais
# NON exclus, compare aux seuils pré-spécifiés (section 3.2) et produit un
# rapport en Markdown.
#
# Aucune analyse non pré-spécifiée n'est effectuée. Si vous souhaitez
# explorer les données au-delà de ce script, faites-le séparément et
# étiquetez explicitement les résultats comme "exploratoire" dans toute
# communication ultérieure.
#
# Dépendances : base R uniquement (aucun package externe requis).
# -----------------------------------------------------------------------------
# Usage :
#   1. Ouvrir R ou RStudio.
#   2. Définir le chemin du CSV ci-dessous (variable csv_path).
#   3. Sourcer le script : source("04-analysis.R")
#   4. Le rapport est généré au même endroit que le CSV (suffixe -report.md).
#
# Auteure : Dayle David (Université Rennes 2)
# Assistant IA : Claude Opus 4.7 (Anthropic), sous direction et validation.
# =============================================================================

# ─── PARAMÈTRES ─────────────────────────────────────────────────────────────
# À ADAPTER : chemin vers le CSV exporté depuis /admin/timing-benchmark
csv_path <- "C:/Users/dadavid/Desktop/mindcraft-timing-benchmark-1780686213694.csv"

# Reproductibilité du bootstrap : seed figée
set.seed(42)
n_bootstrap <- 10000   # méthodo section 4.6

# Seuils pré-spécifiés (méthodologie section 3.2)
# NE PAS MODIFIER après avoir vu les résultats — toute modification doit
# faire l'objet d'un commit séparé qui justifie le changement.
seuils <- list(
  presentation_bias = list(acceptable = 30, cible = 10, unite = "ms"),
  presentation_sd   = list(acceptable = 20, cible = 10, unite = "ms"),
  rt_bias           = list(acceptable = 100, cible = 50, unite = "ms"),
  rt_sd             = list(acceptable = 20, cible = 10, unite = "ms"),
  frame_drop_pct    = list(acceptable = 1.0, cible = 0.5, unite = "%")
)


# ─── LECTURE DU CSV ROBUSTE ─────────────────────────────────────────────────
# Le CSV contient des lignes de métadonnées préfixées par # ainsi que des
# notes libres potentiellement multilignes. On localise la ligne d'en-tête
# des colonnes de données (la première qui commence par "trialIndex,") et
# on parse à partir de là. Les métadonnées sont récupérées séparément.

read_benchmark_csv <- function(path) {
  if (!file.exists(path)) {
    stop("Fichier introuvable : ", path)
  }
  lines <- readLines(path, encoding = "UTF-8")

  # Recherche de la ligne d'en-tête des données
  header_idx <- grep("^trialIndex,", lines)
  if (length(header_idx) == 0) {
    stop("Ligne d'en-tête 'trialIndex,...' non trouvée. CSV malformé ?")
  }
  header_idx <- header_idx[1]

  # Données = lignes après l'en-tête
  data_text <- lines[header_idx:length(lines)]
  df <- read.csv(
    text = paste(data_text, collapse = "\n"),
    stringsAsFactors = FALSE,
    na.strings = c("", "NA")
  )

  # Métadonnées : on extrait les paires "# clef: valeur" des lignes
  # commentaires. Les notes multilignes ne sont pas robustement parsées
  # ici — c'est OK, on rapporte juste ce qu'on trouve.
  meta_lines <- grep("^# [^=]", lines, value = TRUE)
  meta <- list()
  for (line in meta_lines) {
    m <- regmatches(line, regexec("^# ([^:]+):\\s*(.*)$", line))[[1]]
    if (length(m) == 3) {
      meta[[m[2]]] <- m[3]
    }
  }

  list(data = df, metadata = meta)
}


# ─── STATISTIQUES DESCRIPTIVES ──────────────────────────────────────────────
# Méthodo 4.6 :
#   - Tendance centrale : moyenne arithmétique
#   - Dispersion : écart-type
#   - Robuste complémentaire : médiane + IQR
#   - IC 95 % par bootstrap non paramétrique, 10 000 ré-échantillonnages

bootstrap_ci <- function(x, statistic = mean, n = n_bootstrap, conf = 0.95) {
  x <- x[!is.na(x)]
  if (length(x) < 2) return(c(lower = NA, upper = NA))
  boot_stats <- replicate(n, statistic(sample(x, replace = TRUE)))
  alpha <- (1 - conf) / 2
  q <- quantile(boot_stats, probs = c(alpha, 1 - alpha), names = FALSE)
  c(lower = q[1], upper = q[2])
}

describe_metric <- function(x, name) {
  x <- x[!is.na(x)]
  if (length(x) == 0) {
    return(list(n = 0, name = name))
  }
  ci_mean <- bootstrap_ci(x, mean)
  ci_sd   <- bootstrap_ci(x, sd)
  list(
    name = name,
    n = length(x),
    mean = mean(x),
    sd = sd(x),
    median = median(x),
    q1 = quantile(x, 0.25, names = FALSE),
    q3 = quantile(x, 0.75, names = FALSE),
    iqr = IQR(x),
    mean_ci_lower = ci_mean[1],
    mean_ci_upper = ci_mean[2],
    sd_ci_lower = ci_sd[1],
    sd_ci_upper = ci_sd[2],
    min = min(x),
    max = max(x)
  )
}


# ─── VERDICT BINAIRE PAR MÉTRIQUE ───────────────────────────────────────────
# La valeur de comparaison est la BORNE SUPÉRIEURE de l'IC 95 % bootstrap
# (et non la moyenne ponctuelle), conformément à la méthodo 4.6 :
# "la valeur observée (moyenne et borne supérieure IC 95 % bootstrap) est
#  comparée au seuil pré-spécifié [...] Verdict binaire passe / ne passe
#  pas par métrique."

verdict <- function(value_to_test, seuil_acceptable, seuil_cible) {
  if (is.na(value_to_test)) return("N/A")
  if (value_to_test <= seuil_cible) return("PASSE (cible)")
  if (value_to_test <= seuil_acceptable) return("PASSE (acceptable)")
  "NE PASSE PAS"
}


# ─── FORMATTAGE DU RAPPORT ──────────────────────────────────────────────────

format_metric_line <- function(d, seuil = NULL) {
  if (d$n == 0) return("- (aucune donnée)")
  base <- sprintf(
    "- **n = %d** ; moyenne **%.2f** [IC 95 %% %.2f ; %.2f] ; SD **%.2f** [IC 95 %% %.2f ; %.2f] ; médiane %.2f [IQR %.2f–%.2f] ; min %.2f, max %.2f",
    d$n,
    d$mean, d$mean_ci_lower, d$mean_ci_upper,
    d$sd, d$sd_ci_lower, d$sd_ci_upper,
    d$median, d$q1, d$q3,
    d$min, d$max
  )
  if (!is.null(seuil)) {
    v_mean <- verdict(d$mean_ci_upper, seuil$acceptable, seuil$cible)
    v_sd   <- if (!is.null(seuil$sd_acceptable))
      verdict(d$sd_ci_upper, seuil$sd_acceptable, seuil$sd_cible) else NULL
    base <- paste0(base, sprintf(
      "\n  - Seuil moyenne : acceptable ≤ %.1f %s, cible ≤ %.1f %s → **%s** (test sur borne sup IC 95 %% = %.2f)",
      seuil$acceptable, seuil$unite, seuil$cible, seuil$unite,
      v_mean, d$mean_ci_upper
    ))
  }
  base
}


# ─── EXÉCUTION PRINCIPALE ───────────────────────────────────────────────────

cat("→ Lecture du CSV :", csv_path, "\n")
parsed <- read_benchmark_csv(csv_path)
df <- parsed$data
meta <- parsed$metadata

cat("→ Essais totaux :", nrow(df), "\n")
n_excluded <- sum(df$excluded == "true" | df$excluded == TRUE, na.rm = TRUE)
cat("→ Essais exclus :", n_excluded, sprintf("(%.2f %%)\n", n_excluded / nrow(df) * 100))

# Run cassé ? (méthodo 4.7)
pct_exclus <- n_excluded / nrow(df) * 100
if (pct_exclus > 5) {
  cat("\n⚠ ATTENTION : pourcentage d'exclus > 5 % — selon la méthodologie\n")
  cat("  section 4.7, ce run est considéré comme cassé et devrait être\n")
  cat("  relancé. L'analyse continue à titre indicatif uniquement.\n\n")
}

# Filtrage sur essais retenus
df_kept <- df[!(df$excluded == "true" | df$excluded == TRUE), ]
cat("→ Essais retenus pour l'analyse :", nrow(df_kept), "\n\n")

# ─── ANALYSE 1 : PRÉSENTATION DU STIMULUS ───────────────────────────────────
cat("→ Calcul des statistiques de présentation...\n")
presentation_lag <- df_kept$presentation_lag_ms
desc_pres <- describe_metric(presentation_lag, "Présentation lag")

# Détection des frames perdues (méthodo 4.7 : > 100 ms = exclu, mais on
# rapporte aussi le taux de frames perdues > 33 ms = > 2 frames à 60 Hz)
pct_frame_drops_2frames <- mean(presentation_lag > 33, na.rm = TRUE) * 100

# ─── ANALYSE 2 : RT MEASUREMENT OFFSET (overhead JS pur) ────────────────────
cat("→ Calcul des statistiques d'overhead JS du handler...\n")
desc_offset <- describe_metric(df_kept$rt_measurement_offset_ms, "RT measurement offset (handler vs event)")

# ─── ANALYSE 3 : RT MESURÉ vs CIBLE (par condition) ─────────────────────────
cat("→ Calcul des statistiques de RT par condition...\n")
conditions <- sort(unique(df_kept$condition_target_rt_ms))
rt_by_condition <- list()
for (cond in conditions) {
  sub <- df_kept[df_kept$condition_target_rt_ms == cond, ]
  # Biais = RT mesuré - RT cible (overshoot du robot ET de la mesure)
  bias <- sub$rt_measured_ms - cond
  rt_by_condition[[as.character(cond)]] <- describe_metric(
    bias, sprintf("Biais RT mesuré (cible %d ms)", cond)
  )
}

# ─── GÉNÉRATION DU RAPPORT MARKDOWN ─────────────────────────────────────────

report_path <- sub("\\.csv$", "-report.md", csv_path)
cat("→ Génération du rapport :", report_path, "\n")

writeReport <- function(report_path) {
  con <- file(report_path, "w", encoding = "UTF-8")
  on.exit(close(con))
  W <- function(...) cat(..., file = con, sep = "")

  W("# Rapport d'analyse — Benchmark de précision temporelle MindCraft\n\n")
  W("Conforme à la méthodologie pré-spécifiée [`docs/timing-validation/01-methodology.md`](../01-methodology.md), section 4.6.\n\n")
  W("Généré par `04-analysis.R` le ", format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"), ".\n\n")
  W("---\n\n")

  W("## 1. Configuration du run\n\n")
  W("| Champ | Valeur |\n|---|---|\n")
  for (k in c("MindCraft version", "Git SHA", "OS", "Browser", "Refresh rate (Hz)",
              "platform", "cpu_cores", "device_memory_gb", "screen_width_px",
              "screen_height_px", "device_pixel_ratio", "timezone")) {
    v <- meta[[k]]
    if (!is.null(v)) W("| ", k, " | ", v, " |\n")
  }
  W("| total_trials | ", meta[["total_trials"]], " |\n")
  W("| duration_ms | ", meta[["duration_ms"]], " |\n")
  W("| timestamp_iso | ", meta[["timestamp_iso"]], " |\n\n")

  W("## 2. Qualité du run\n\n")
  W("- Essais totaux : **", nrow(df), "**\n")
  W(sprintf("- Essais exclus : **%d** (%.2f %%)\n", n_excluded, pct_exclus))
  W("- Run cassé selon méthodo (> 5 % exclus) ? **",
    ifelse(pct_exclus > 5, "OUI ⚠", "Non ✅"), "**\n")
  W(sprintf("- Frames perdues (> 33 ms = > 2 frames à 60 Hz) : **%.2f %%**\n", pct_frame_drops_2frames))
  v_frames <- verdict(pct_frame_drops_2frames, seuils$frame_drop_pct$acceptable, seuils$frame_drop_pct$cible)
  W(sprintf("  - Seuil : acceptable ≤ %.1f %%, cible ≤ %.1f %% → **%s**\n\n",
            seuils$frame_drop_pct$acceptable, seuils$frame_drop_pct$cible, v_frames))

  W("## 3. Présentation du stimulus\n\n")
  W("**Métrique** : `t_stim_painted - t_stim_requested` (lag entre demande JavaScript et paint à l'écran via double `requestAnimationFrame`).\n\n")
  W(format_metric_line(desc_pres, seuil = list(
    acceptable = seuils$presentation_bias$acceptable,
    cible = seuils$presentation_bias$cible,
    unite = seuils$presentation_bias$unite
  )), "\n")
  v_pres_sd <- verdict(desc_pres$sd_ci_upper, seuils$presentation_sd$acceptable, seuils$presentation_sd$cible)
  W(sprintf("  - Seuil SD : acceptable ≤ %.1f %s, cible ≤ %.1f %s → **%s** (test sur borne sup IC 95 %% SD = %.2f)\n\n",
            seuils$presentation_sd$acceptable, seuils$presentation_sd$unite,
            seuils$presentation_sd$cible, seuils$presentation_sd$unite,
            v_pres_sd, desc_pres$sd_ci_upper))

  W("## 4. Overhead JavaScript du handler keydown\n\n")
  W("**Métrique** : `t_keydown_handler - t_keydown_event` (décalage entre le timestamp natif de l'événement clavier et l'exécution du handler JS).\n\n")
  W(format_metric_line(desc_offset), "\n\n")
  W("*Note : cette métrique mesure l'overhead JS pur côté MindCraft (post-réception de l'événement). Pas de seuil pré-spécifié — c'est une mesure descriptive complémentaire.*\n\n")

  W("## 5. Biais du RT mesuré par rapport à la cible (par condition)\n\n")
  W("**Métrique** : `rt_measured_ms - condition_target_rt_ms` (combine l'imprécision du robot `setTimeout` et l'overhead de mesure côté plateforme).\n\n")
  for (cond in names(rt_by_condition)) {
    d <- rt_by_condition[[cond]]
    W("### Condition RT cible = ", cond, " ms\n\n")
    W(format_metric_line(d, seuil = list(
      acceptable = seuils$rt_bias$acceptable,
      cible = seuils$rt_bias$cible,
      unite = seuils$rt_bias$unite
    )), "\n")
    v_rt_sd <- verdict(d$sd_ci_upper, seuils$rt_sd$acceptable, seuils$rt_sd$cible)
    W(sprintf("  - Seuil SD : acceptable ≤ %.1f %s, cible ≤ %.1f %s → **%s** (test sur borne sup IC 95 %% SD = %.2f)\n\n",
              seuils$rt_sd$acceptable, seuils$rt_sd$unite,
              seuils$rt_sd$cible, seuils$rt_sd$unite,
              v_rt_sd, d$sd_ci_upper))
  }

  W("## 6. Verdict global\n\n")
  # Verdict global : toutes les métriques doivent passer le seuil acceptable
  # pour "Conforme aux standards web". Toutes en cible = "Précision web optimale".
  # Une seule en NE PASSE PAS = "Non conforme".
  v_all <- c(
    v_frames,
    verdict(desc_pres$mean_ci_upper, seuils$presentation_bias$acceptable, seuils$presentation_bias$cible),
    v_pres_sd
  )
  for (cond in names(rt_by_condition)) {
    d <- rt_by_condition[[cond]]
    v_all <- c(v_all,
      verdict(d$mean_ci_upper, seuils$rt_bias$acceptable, seuils$rt_bias$cible),
      verdict(d$sd_ci_upper, seuils$rt_sd$acceptable, seuils$rt_sd$cible)
    )
  }

  if (any(v_all == "NE PASSE PAS")) {
    W("### ⚠ NON CONFORME\n\n")
    W("Au moins une métrique dépasse le seuil acceptable pré-spécifié.\n")
    W("Conformément à l'engagement méthodologique section 6, ce résultat\n")
    W("est rapporté tel quel, sans tentative d'ajustement post-hoc.\n")
    W("Les corrections envisagées doivent être documentées séparément.\n\n")
  } else if (all(v_all %in% c("PASSE (cible)", "N/A"))) {
    W("### ✅ PRÉCISION WEB OPTIMALE\n\n")
    W("Toutes les métriques sont dans la zone *cible* (borne basse de la littérature publiée pour jsPsych en config optimale).\n\n")
  } else {
    W("### ✅ CONFORME AUX STANDARDS WEB\n\n")
    W("Toutes les métriques sont dans la zone *acceptable* (cohérente avec la borne haute de la littérature publiée pour jsPsych).\n\n")
  }

  W("## 7. Limites rappelées\n\n")
  W("- Ce benchmark mesure uniquement la précision **logicielle** (pipeline JS+DOM). La chaîne hardware complète (écran → photodiode → appui mécanique) n'est pas validée. Une validation hardware avec Black Box Toolkit ou photodiode + Arduino reste nécessaire pour les paradigmes ultra-sensibles.\n")
  W("- Configuration unique testée : Windows 11 + Chrome. Les résultats ne se généralisent pas automatiquement à macOS/Safari ou autres combinaisons.\n")
  W("- La comparaison avec la littérature jsPsych est asymétrique : leurs chiffres incluent l'overhead hardware (mesuré avec BBTK), les nôtres non. Affirmation autorisée : « overhead logiciel comparable ». Affirmation NON autorisée : « précision temporelle équivalente ».\n\n")

  W("---\n\n")
  W("*Rapport généré automatiquement par `04-analysis.R` à partir du CSV brut. ",
    "Aucune analyse non pré-spécifiée n'a été menée. Méthodologie : ",
    "[`01-methodology.md`](../01-methodology.md).*\n")
}

writeReport(report_path)
cat("\n✓ Rapport généré :", report_path, "\n")
cat("✓ Tu peux l'ouvrir avec n'importe quel éditeur Markdown.\n\n")
