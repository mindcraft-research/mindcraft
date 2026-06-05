// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Robot participant : simule un appui clavier après un délai cible
// mesuré à partir d'un timestamp de référence (typiquement t_stim_painted).
//
// Spec stricte (méthodologie section 4.8) :
//   - Mécanisme : document.dispatchEvent(new KeyboardEvent('keydown', ...))
//   - Élément cible : document (bubble jusqu'au handler global)
//   - Propriétés :
//       key: ' ', code: 'Space', keyCode: 32,
//       bubbles: true, cancelable: true, composed: true
//   - Calibration : setTimeout démarré à t_ref, délai effectif mesuré
//     post-hoc via performance.now() à l'entrée du dispatch.
//
// Limite assumée : ce mécanisme court-circuite la couche d'entrée OS
// (driver USB clavier, file d'événements OS). Le RT mesuré est donc un
// MINORANT par rapport à un vrai clavier physique. Overhead manquant
// estimé 5-20 ms (USB poll rate 125 Hz = 8 ms + traitement OS).

/**
 * Programme un appui clavier simulé à T = tRef + targetDelayMs.
 *
 * Retourne une Promise qui résout avec :
 *   {
 *     dispatched: performance.now() juste avant dispatchEvent,
 *     effectiveDelay: dispatched - tRef (le délai réellement obtenu)
 *   }
 *
 * Le code appelant doit avoir installé son propre listener `keydown`
 * sur `document` AVANT d'appeler `scheduleKeypress`, sinon l'événement
 * n'est pas capturé.
 *
 * Note : setTimeout a une résolution limitée (typiquement 4 ms sur les
 * navigateurs modernes en raison du throttling). L'écart entre le délai
 * cible et le délai effectif est donc à analyser, pas à ignorer.
 */
export function scheduleKeypress(tRef, targetDelayMs) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const dispatched = performance.now()
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        keyCode: 32,
        which: 32,        // ancien navigateur, ignoré sur récent
        bubbles: true,
        cancelable: true,
        composed: true,
      })
      document.dispatchEvent(event)
      resolve({ dispatched, effectiveDelay: dispatched - tRef })
    }, targetDelayMs)
  })
}
