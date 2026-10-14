// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du type d'appareil (lib/device.js).

import { describe, it, expect } from 'vitest'
import { appareilDepuisUserAgent, appareilDeSession, metadataSession } from '../src/lib/device.js'

const UA = {
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ipadAncien: 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
}

describe('appareilDepuisUserAgent', () => {
  it('reconnaît les cas courants', () => {
    expect(appareilDepuisUserAgent(UA.windowsChrome)).toBe('ordinateur')
    expect(appareilDepuisUserAgent(UA.mac)).toBe('ordinateur')
    expect(appareilDepuisUserAgent(UA.iphone)).toBe('mobile')
    expect(appareilDepuisUserAgent(UA.androidPhone)).toBe('mobile')
    expect(appareilDepuisUserAgent(UA.androidTablet)).toBe('tablette')
    expect(appareilDepuisUserAgent(UA.ipadAncien)).toBe('tablette')
  })
  it('vide si inconnu', () => {
    expect(appareilDepuisUserAgent('')).toBe('')
    expect(appareilDepuisUserAgent(undefined)).toBe('')
  })
})

describe('appareilDeSession', () => {
  it('valeur enregistrée prioritaire', () => {
    expect(appareilDeSession({ appareil: 'tablette', userAgent: UA.windowsChrome })).toBe('tablette')
  })
  it('anciennes sessions : déduit du user agent', () => {
    expect(appareilDeSession({ source: 'direct', userAgent: UA.iphone })).toBe('mobile')
  })
  it('rien → vide', () => {
    expect(appareilDeSession({})).toBe('')
    expect(appareilDeSession(null)).toBe('')
  })
})

describe('metadataSession (minimisation)', () => {
  it('ne garde que source, lang et appareil', () => {
    expect(metadataSession({ source: 'direct', lang: 'en', appareil: 'mobile', userAgent: UA.iphone, autre: 1 }))
      .toEqual({ source: 'direct', lang: 'en', appareil: 'mobile' })
  })
  it('ignore un appareil inconnu et les entrées invalides', () => {
    expect(metadataSession({ appareil: 'console' })).toEqual({})
    expect(metadataSession(null)).toEqual({})
  })
})
