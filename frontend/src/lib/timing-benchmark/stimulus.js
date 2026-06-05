// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Affichage du stimulus de benchmark et capture du timestamp de peinture.
//
// Spec stricte (méthodologie section 4.0) :
//   - Carré 200x200 px, couleur #FFFFFF
//   - Fond #000000 (noir pur)
//   - Position : centre de la fenêtre via translate(-50%, -50%)
//   - Aucune police, texte, image, animation
//
// Capture du paint :
//   On expose un élément div pré-créé, on bascule sa visibilité via
//   `display: none` -> `display: block`. Le timestamp est capturé dans le
//   PROCHAIN `requestAnimationFrame` callback, qui par spec navigateur
//   est exécuté juste avant le repaint suivant. C'est l'approche
//   recommandée dans la littérature de benchmark web (Anwyl-Irvine 2021).
//
// `t_stim_requested` : performance.now() juste avant de basculer display
// `t_stim_painted`   : performance.now() au début du callback rAF suivant
//
// Limite assumée : ce mécanisme mesure le temps entre l'instruction JS
// et le rAF suivant, qui correspond à l'instant juste AVANT le repaint
// effectif. Pour mesurer l'instant exact où le photon est émis par
// l'écran, il faudrait un photodiode (cf. méthodo section 9).

/**
 * Crée et insère dans le DOM les éléments DOM utilisés par le benchmark
 * (overlay noir + stimulus blanc). Retourne une API pour les contrôler.
 *
 * Appeler `mount()` une fois au démarrage du benchmark, puis utiliser
 * `show()` / `hide()` à chaque essai. `unmount()` à la fin pour nettoyer.
 */
export function createStimulusDriver() {
  let overlay = null
  let stimulus = null

  function mount() {
    if (overlay) return // déjà monté

    // Overlay noir plein écran : élimine toute pollution visuelle de la
    // page (boutons, headers) pendant le benchmark. Permet aussi de
    // mesurer la luminance avec un photodiode (mode hardware futur).
    overlay = document.createElement('div')
    overlay.id = 'mc-bench-overlay'
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: '#000000',
      zIndex: '99999',
      display: 'none',
    })

    // Stimulus blanc centré, dimensions et position figées par la méthodo
    stimulus = document.createElement('div')
    stimulus.id = 'mc-bench-stimulus'
    Object.assign(stimulus.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '200px',
      height: '200px',
      background: '#FFFFFF',
      display: 'none',
    })

    overlay.appendChild(stimulus)
    document.body.appendChild(overlay)
  }

  function unmount() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay)
    }
    overlay = null
    stimulus = null
  }

  function showOverlay() {
    if (!overlay) throw new Error('Driver pas monté — appeler mount() d\'abord')
    overlay.style.display = 'block'
  }

  function hideOverlay() {
    if (!overlay) return
    overlay.style.display = 'none'
  }

  /**
   * Affiche le stimulus et retourne une Promise qui résout avec
   * {requested, painted} dès que le prochain rAF s'exécute.
   *
   * - requested : performance.now() au moment exact où on bascule display
   * - painted   : performance.now() à l'entrée du rAF callback suivant
   */
  function presentStimulus() {
    return new Promise((resolve) => {
      // Mesure JUSTE avant la mutation DOM. L'ordre importe : on lit
      // l'horloge d'abord, puis on déclenche le changement, pour ne pas
      // que le coût de la mutation pollue la mesure.
      const requested = performance.now()
      stimulus.style.display = 'block'

      // Double rAF : le premier rAF se déclenche avant le repaint, le
      // second garantit qu'on est bien APRÈS le repaint. Cette technique
      // est documentée dans la littérature (Anwyl-Irvine 2021 §Methods).
      // Un seul rAF peut être appelé AVANT que le changement de style
      // soit commité au compositor, donc on attend un cycle de plus.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const painted = performance.now()
          resolve({ requested, painted })
        })
      })
    })
  }

  function hideStimulus() {
    if (stimulus) stimulus.style.display = 'none'
  }

  return {
    mount,
    unmount,
    showOverlay,
    hideOverlay,
    presentStimulus,
    hideStimulus,
  }
}
