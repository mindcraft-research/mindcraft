// SPDX-License-Identifier: AGPL-3.0-or-later
// Version de MindCraft à citer selon la période de collecte (lib/versions.js).

import { describe, it, expect } from 'vitest'
import { versionsPourPeriode, texteVersions } from '../src/lib/versions.js'

const noms = (vs) => vs.map((v) => v.version)
const apres = new Date('2026-11-05')

describe('versionsPourPeriode', () => {
  it('collecte avant le 19 octobre 2026 : v0.1.0', () => {
    expect(noms(versionsPourPeriode('2026-09-01', '2026-10-10', apres))).toEqual(['0.1.0'])
    expect(noms(versionsPourPeriode('2026-09-01', '2026-10-18', apres))).toEqual(['0.1.0'])
  })
  it('collecte à partir du 19 octobre 2026 : v0.2.0', () => {
    expect(noms(versionsPourPeriode('2026-10-19', '2026-10-30', apres))).toEqual(['0.2.0'])
  })
  it('collecte à cheval : les deux, de la plus ancienne à la plus récente', () => {
    expect(noms(versionsPourPeriode('2026-10-01', null, apres))).toEqual(['0.1.0', '0.2.0'])
    expect(texteVersions(versionsPourPeriode('2026-10-01', null, apres))).toContain('puis 0.2.0 (à partir du 19 octobre 2026')
  })
  it('sans date de collecte : la version actuelle', () => {
    expect(noms(versionsPourPeriode(null, null))).toEqual(['0.2.0'])
  })
})
