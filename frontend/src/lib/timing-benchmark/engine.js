// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Moteur principal du benchmark : orchestre N essais par condition de RT.
//
// Pour chaque essai, on capture les 5 timestamps spécifiés dans la
// méthodologie section 4.1 :
//   - t_stim_requested        : performance.now() avant changement display
//   - t_stim_painted          : performance.now() au rAF post-paint
//   - t_keydown_event         : KeyboardEvent.timeStamp natif
//   - t_keydown_handler       : performance.now() à l'entrée du handler
//   - t_response_recorded     : performance.now() après update du store
//                               (ici on simplifie : juste après le push
//                               dans le tableau de résultats)
//
// Critères d'exclusion (méthodo section 4.7) appliqués automatiquement :
//   - frame drop > 100 ms
//   - tab a perdu le focus (visibilitychange / blur)
//   - ITI réel s'écartant de > 50 % de la cible
//   - réponse robot non détectée
//
// Les essais exclus sont conservés dans les données brutes avec un
// champ `excluded_reason` (transparence > propreté).

import { createStimulusDriver } from './stimulus'
import { scheduleKeypress } from './robot'

/**
 * Lance le benchmark complet.
 *
 * @param {Object} config
 * @param {number} config.trialsPerCondition  N essais par condition (défaut 200, cf. méthodo 4.3)
 * @param {number[]} config.rtConditionsMs    Liste des RT simulés (défaut [200, 500, 800])
 * @param {[number,number]} config.itiRangeMs Range aléatoire ITI [min, max] (défaut [500, 1500])
 * @param {(progress: {trialIndex, totalTrials, condition}) => void} config.onProgress
 *
 * @returns {Promise<{trials: Object[], runMetadata: Object}>}
 *   trials = un objet par essai (incluant exclus) avec tous les timestamps
 *   runMetadata = info sur le run (timing global, nombre d'exclusions, etc.)
 */
export async function runBenchmark(config = {}) {
  const {
    trialsPerCondition = 200,
    rtConditionsMs = [200, 500, 800],
    itiRangeMs = [500, 1500],
    onProgress = () => {},
  } = config

  const trials = []
  const runStarted = performance.now()
  const driver = createStimulusDriver()
  driver.mount()
  driver.showOverlay()

  // Détection de perte de focus pendant le run : on flague et exclut tous
  // les essais touchés. La méthodo demande aussi d'identifier les runs
  // « cassés » (> 5 % d'essais exclus), ce qui se calcule a posteriori.
  let tabLostFocusFlag = false
  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') tabLostFocusFlag = true
  }
  const onBlur = () => { tabLostFocusFlag = true }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', onBlur)

  try {
    // Construction de la liste totale d'essais : on alterne les conditions
    // pour éviter qu'un drift thermique / battery affecte une condition
    // en particulier. Ordre : pour chaque essai i de 0 à N-1, on fait
    // la condition (i % nbConditions). Plus simple et déterministe que
    // de randomiser, ce qui aide à reproduire.
    const nbConditions = rtConditionsMs.length
    const totalTrials = trialsPerCondition * nbConditions

    for (let i = 0; i < totalTrials; i++) {
      const condition = rtConditionsMs[i % nbConditions]
      onProgress({ trialIndex: i, totalTrials, condition })

      // ITI aléatoire pour cet essai (avant le stimulus)
      const itiTarget = randomBetween(itiRangeMs[0], itiRangeMs[1])
      const itiStart = performance.now()
      await wait(itiTarget)
      const itiActual = performance.now() - itiStart

      // Présentation du stimulus + capture paint
      const { requested, painted } = await driver.presentStimulus()

      // Installation du listener AVANT de programmer le robot
      let keydownData = null
      const onKeydown = (event) => {
        if (keydownData) return // déjà capturé pour cet essai
        keydownData = {
          eventTimeStamp: event.timeStamp,
          handlerTimestamp: performance.now(),
        }
      }
      document.addEventListener('keydown', onKeydown, { once: true })

      // Programmation du robot avec délai cible
      const { dispatched, effectiveDelay } = await scheduleKeypress(painted, condition)

      // Attendre que le handler soit appelé (microtask flush)
      await wait(5)

      // Désinstaller le listener (au cas où il n'aurait pas été déclenché)
      document.removeEventListener('keydown', onKeydown)

      const responseRecorded = performance.now()

      // Calcul des critères d'exclusion (cf. méthodo 4.7)
      const exclusionReasons = []
      const presentationLag = painted - requested
      if (presentationLag > 100) {
        exclusionReasons.push('frame_drop_severe') // > 100 ms = > 6 frames à 60 Hz
      }
      if (tabLostFocusFlag) {
        exclusionReasons.push('tab_lost_focus')
        tabLostFocusFlag = false // reset pour les essais suivants
      }
      const itiDeviation = Math.abs(itiActual - itiTarget) / itiTarget
      if (itiDeviation > 0.5) {
        exclusionReasons.push('iti_deviation_over_50pct')
      }
      if (!keydownData) {
        exclusionReasons.push('robot_keydown_not_detected')
      }

      // Hide stimulus pour préparer l'essai suivant
      driver.hideStimulus()

      trials.push({
        trialIndex: i,
        condition_target_rt_ms: condition,
        iti_target_ms: itiTarget,
        iti_actual_ms: itiActual,
        t_stim_requested: requested,
        t_stim_painted: painted,
        presentation_lag_ms: presentationLag,
        t_keydown_event: keydownData?.eventTimeStamp ?? null,
        t_keydown_handler: keydownData?.handlerTimestamp ?? null,
        t_robot_dispatched: dispatched,
        robot_effective_delay_ms: effectiveDelay,
        rt_measured_ms: keydownData ? keydownData.handlerTimestamp - painted : null,
        rt_measurement_offset_ms: keydownData
          ? (keydownData.handlerTimestamp - keydownData.eventTimeStamp)
          : null,
        t_response_recorded: responseRecorded,
        excluded: exclusionReasons.length > 0,
        excluded_reason: exclusionReasons.join('|') || '',
      })
    }
  } finally {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('blur', onBlur)
    driver.hideOverlay()
    driver.unmount()
  }

  const runEnded = performance.now()
  const excludedCount = trials.filter((t) => t.excluded).length
  const excludedPct = (excludedCount / trials.length) * 100

  return {
    trials,
    runMetadata: {
      total_trials: trials.length,
      excluded_trials: excludedCount,
      excluded_pct: excludedPct,
      run_broken: excludedPct > 5, // méthodo 4.7
      duration_ms: runEnded - runStarted,
      timestamp_iso: new Date().toISOString(),
    },
  }
}

/** Attente précise via setTimeout. Note : résolution typique 4 ms. */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}
