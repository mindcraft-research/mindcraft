// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Export des résultats du benchmark en CSV avec en-tête contenant la
// configuration matérielle (méthodo section 4.4).

/**
 * Détecte ce qu'on peut sur la config hardware/browser depuis JavaScript.
 * Tout est navigateur-only — pour la résolution écran et le taux de
 * rafraîchissement, on demandera à l'utilisateur d'entrer manuellement
 * (le navigateur n'expose pas le refresh rate de façon fiable).
 */
export function detectClientConfig() {
  const ua = navigator.userAgent
  return {
    user_agent: ua,
    platform: navigator.platform || 'unknown',
    cpu_cores: navigator.hardwareConcurrency || 'unknown',
    device_memory_gb: navigator.deviceMemory || 'unknown',
    screen_width_px: window.screen.width,
    screen_height_px: window.screen.height,
    screen_color_depth: window.screen.colorDepth,
    device_pixel_ratio: window.devicePixelRatio,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

/**
 * Génère le contenu CSV complet (en-tête de config + ligne d'en-tête
 * de colonnes + 1 ligne par essai).
 *
 * @param {Object} runResult - retour de runBenchmark()
 * @param {Object} userMetadata - infos fournies par l'utilisateur dans le form
 *   { os, browser, refresh_rate_hz, notes, mindcraft_version, mindcraft_git_sha }
 */
export function buildCSV(runResult, userMetadata = {}) {
  const clientConfig = detectClientConfig()
  const lines = []

  // En-tête de métadonnées (lignes commençant par # — ignorées par la
  // plupart des outils CSV, ou parsables explicitement par notre script
  // d'analyse Python à venir).
  lines.push('# MindCraft Timing Validation Benchmark — Raw Data')
  lines.push(`# Generated: ${runResult.runMetadata.timestamp_iso}`)
  lines.push(`# Methodology: docs/timing-validation/01-methodology.md`)
  lines.push('#')
  lines.push('# MindCraft version: ' + (userMetadata.mindcraft_version || 'unknown'))
  lines.push('# Git SHA: ' + (userMetadata.mindcraft_git_sha || 'unknown'))
  lines.push('#')
  lines.push('# === USER-PROVIDED CONFIG ===')
  // On remplace les sauts de ligne par " | " dans chaque champ de
  // métadonnées : sinon une note multilignes casse les outils CSV qui
  // ne reconnaissent pas le caractère # comme commentaire et lisent la
  // 2e ligne d'une note comme une ligne de données vide ou invalide.
  const safe = (v) => String(v || '').replace(/\r?\n/g, ' | ')
  lines.push('# OS: ' + safe(userMetadata.os || 'not provided'))
  lines.push('# Browser: ' + safe(userMetadata.browser || 'not provided'))
  lines.push('# Refresh rate (Hz): ' + safe(userMetadata.refresh_rate_hz || 'not provided'))
  lines.push('# Notes: ' + safe(userMetadata.notes))
  lines.push('#')
  lines.push('# === AUTO-DETECTED CONFIG ===')
  Object.entries(clientConfig).forEach(([k, v]) => {
    lines.push(`# ${k}: ${v}`)
  })
  lines.push('#')
  lines.push('# === RUN METADATA ===')
  Object.entries(runResult.runMetadata).forEach(([k, v]) => {
    lines.push(`# ${k}: ${v}`)
  })
  lines.push('#')
  lines.push('# === TRIAL DATA (one row per trial, includes excluded) ===')

  // Ligne d'en-tête des colonnes
  const columns = [
    'trialIndex',
    'condition_target_rt_ms',
    'iti_target_ms',
    'iti_actual_ms',
    't_stim_requested',
    't_stim_painted',
    'presentation_lag_ms',
    't_keydown_event',
    't_keydown_handler',
    't_robot_dispatched',
    'robot_effective_delay_ms',
    'rt_measured_ms',
    'rt_measurement_offset_ms',
    't_response_recorded',
    'excluded',
    'excluded_reason',
  ]
  lines.push(columns.join(','))

  // 1 ligne par essai
  for (const trial of runResult.trials) {
    const row = columns.map((c) => {
      const v = trial[c]
      if (v === null || v === undefined) return ''
      if (typeof v === 'boolean') return v ? 'true' : 'false'
      if (typeof v === 'number') return v.toString()
      // String : échapper guillemets et entourer si contient virgule
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    })
    lines.push(row.join(','))
  }

  return lines.join('\n')
}

/**
 * Déclenche le téléchargement du CSV par le navigateur.
 */
export function downloadCSV(csvContent, filename = null) {
  const fname = filename || `mindcraft-timing-benchmark-${Date.now()}.csv`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fname
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
