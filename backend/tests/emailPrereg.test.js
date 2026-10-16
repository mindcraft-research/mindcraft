// SPDX-License-Identifier: AGPL-3.0-or-later
// E-mail « préenregistrement verrouillé » (lib/email.js). Aucun envoi réel :
// la clé Resend est vidée avant le chargement du module.

import { describe, it, expect, beforeAll } from 'vitest'

let email
beforeAll(async () => {
  process.env.RESEND_API_KEY = ''
  email = await import('../src/lib/email.js')
})

const base = { titre: 'Étude <b>« test »</b>', verrouilleLe: '2026-10-16T10:00:00Z', verrouillePar: 'ada', empreinte: 'ab'.repeat(32), lien: 'https://ex.org/prereg/x' }

describe('emailPreregVerrouille', () => {
  it('français : objet, date de Paris, titre échappé, lien et explication', () => {
    const { sujet, html } = email.emailPreregVerrouille({ ...base, langue: 'fr' })
    expect(sujet).toBe('Préenregistrement verrouillé : « Étude <b>« test »</b> »')
    expect(html).toContain('Étude &lt;b&gt;« test »&lt;/b&gt;')
    expect(html).not.toContain('<b>« test »</b>')
    expect(html).toContain('16 octobre 2026 à 12:00')
    expect(html).toContain('https://ex.org/prereg/x')
    expect(html).toMatch(/pas besoin de compte MindCraft/)
  })
  it('anglais', () => {
    const { sujet, html } = email.emailPreregVerrouille({ ...base, langue: 'en' })
    expect(sujet).toMatch(/^Preregistration locked:/)
    expect(html).toMatch(/The PDF is attached/)
  })
  it('sans clé Resend : rien n’est envoyé', async () => {
    const r = await email.sendPreregLockedEmail({ ...base, to: 'a@ex.org', bcc: ['b@ex.org'], pdf: Buffer.from('%PDF'), nomFichier: 'p.pdf' })
    expect(r).toEqual({ success: false, error: 'no_api_key' })
  })
})
