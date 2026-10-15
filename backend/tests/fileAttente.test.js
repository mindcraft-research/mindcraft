// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de la file d'attente par clé (lib/fileAttente.js).

import { describe, it, expect } from 'vitest'
import { enFile, tailleFiles } from '../src/lib/fileAttente.js'

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

describe('enFile', () => {
  it('même clé : une tâche à la fois, dans l’ordre d’arrivée', async () => {
    let enCours = 0, maxEnCours = 0
    const ordre = []
    await Promise.all(Array.from({ length: 20 }, (_, i) => enFile('etude-1', async () => {
      enCours++; maxEnCours = Math.max(maxEnCours, enCours)
      await pause(Math.random() * 5)
      ordre.push(i); enCours--
      return i
    })))
    expect(maxEnCours).toBe(1)
    expect(ordre).toEqual([...Array(20).keys()])
  })

  it('clés différentes : en parallèle', async () => {
    let enCours = 0, maxEnCours = 0
    const tache = async () => { enCours++; maxEnCours = Math.max(maxEnCours, enCours); await pause(10); enCours-- }
    await Promise.all([enFile('a', tache), enFile('b', tache), enFile('c', tache)])
    expect(maxEnCours).toBe(3)
  })

  it('renvoie le résultat ou l’erreur de sa tâche ; une erreur ne bloque pas la suite', async () => {
    const r1 = enFile('k', async () => { throw new Error('échec') })
    const r2 = enFile('k', async () => 'ok')
    await expect(r1).rejects.toThrow('échec')
    await expect(r2).resolves.toBe('ok')
  })

  it('libère les clés une fois la file vide', async () => {
    await Promise.all([enFile('x', async () => 1), enFile('y', async () => 2)])
    await pause(0)
    expect(tailleFiles()).toBe(0)
  })
})
