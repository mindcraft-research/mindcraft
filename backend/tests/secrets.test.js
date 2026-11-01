// SPDX-License-Identifier: AGPL-3.0-or-later
// Clé de signature des sessions (lib/secrets.js) : les valeurs d'exemple,
// publiques, sont refusées hors développement et test.

import { describe, it, expect } from 'vitest'
import { problemeSecretJwt, verifierSecretJwt } from '../src/lib/secrets.js'

const EXEMPLE_COMPOSE = 'please_change_me_dev_only_64chars_minimum_abcdef1234567890abcdef'
const EXEMPLE_ENV = 'CHANGE_THIS_TO_A_RANDOM_SECRET_KEY'
const BONNE = 'k3J9xQ2vL8mN4pR7tW1yZ5bC6dF0gH3jK8lM2nP5qS9u'

describe('problemeSecretJwt', () => {
  it('reconnaît les cas', () => {
    expect(problemeSecretJwt(undefined)).toBe('manquante')
    expect(problemeSecretJwt('')).toBe('manquante')
    expect(problemeSecretJwt(EXEMPLE_COMPOSE)).toBe('exemple')
    expect(problemeSecretJwt(EXEMPLE_ENV)).toBe('exemple')
    expect(problemeSecretJwt('courte')).toBe('courte')
    expect(problemeSecretJwt(BONNE)).toBeNull()
  })
})

describe('verifierSecretJwt', () => {
  it('refuse une clé d’exemple en production (ou sans NODE_ENV)', () => {
    expect(verifierSecretJwt(EXEMPLE_COMPOSE, 'production').ok).toBe(false)
    expect(verifierSecretJwt(EXEMPLE_ENV, undefined).ok).toBe(false)
    expect(verifierSecretJwt(undefined, 'development').ok).toBe(false)
  })
  it('l’accepte en développement et en test, avec un avertissement', () => {
    expect(verifierSecretJwt(EXEMPLE_COMPOSE, 'development')).toMatchObject({ ok: true })
    expect(verifierSecretJwt(EXEMPLE_COMPOSE, 'test').message).toBeTruthy()
  })
  it('une clé courte démarre, avec un avertissement ; une bonne clé, sans', () => {
    expect(verifierSecretJwt('courte', 'production')).toMatchObject({ ok: true })
    expect(verifierSecretJwt('courte', 'production').message).toBeTruthy()
    expect(verifierSecretJwt(BONNE, 'production')).toEqual({ ok: true, message: null })
  })
})
