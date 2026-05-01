'use strict'

const { Resend } = require('resend')

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'MindCraft <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// ─── HTML template ───────────────────────────────────────────────────────────

function buildEmail(title, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#4F46E5;border-radius:12px 12px 0 0;padding:20px 24px;text-align:center;">
    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:0.5px;">MindCraft</span>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:32px 28px;">
    <h2 style="color:#1e3a5f;font-size:18px;margin:0 0 16px;font-weight:600;">${title}</h2>
    ${bodyHtml}
  </div>
  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:11px;">
    MindCraft — mindcraft-research.fr<br/>
    Plateforme de recherche expérimentale
  </div>
</div>
</body></html>`
}

function ctaButton(text, url) {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;padding:14px 32px;background:#4F46E5;color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">${text}</a>
  </div>`
}

// ─── Email functions ─────────────────────────────────────────────────────────

async function sendEmail(to, subject, html) {
  if (!resend) {
    console.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`)
    return { success: false, error: 'no_api_key' }
  }
  try {
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html })
    return { success: true }
  } catch (err) {
    console.error('[EMAIL] Error:', err.message)
    return { success: false, error: err.message }
  }
}

async function sendVerificationEmail(email, username, token) {
  const url = `${FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`
  const html = buildEmail('Vérifiez votre adresse e-mail', `
    <p style="color:#374151;font-size:14px;line-height:1.7;">Bonjour <strong>${username}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;">Merci de vous être inscrit(e) sur MindCraft ! Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
    ${ctaButton('Vérifier mon adresse e-mail', url)}
    <p style="color:#9ca3af;font-size:12px;">Ce lien est valable 24 heures. Si vous n'avez pas créé de compte, ignorez cet e-mail.</p>
  `)
  return sendEmail(email, 'Vérifiez votre adresse e-mail — MindCraft', html)
}

async function sendWelcomeEmail(email, username) {
  const url = `${FRONTEND_URL}/dashboard`
  const html = buildEmail('Bienvenue sur MindCraft !', `
    <p style="color:#374151;font-size:14px;line-height:1.7;">Bonjour <strong>${username}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;">Votre compte est maintenant activé. Vous pouvez commencer à créer vos études expérimentales.</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;">Un projet de démonstration a été créé pour vous — explorez-le pour découvrir toutes les fonctionnalités de la plateforme.</p>
    ${ctaButton('Accéder à mon espace', url)}
  `)
  return sendEmail(email, 'Bienvenue sur MindCraft !', html)
}

async function sendPasswordResetEmail(email, username, token) {
  const url = `${FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  const html = buildEmail('Réinitialisation de votre mot de passe', `
    <p style="color:#374151;font-size:14px;line-height:1.7;">Bonjour <strong>${username}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
    ${ctaButton('Réinitialiser mon mot de passe', url)}
    <p style="color:#9ca3af;font-size:12px;">Ce lien est valable 1 heure. Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>
  `)
  return sendEmail(email, 'Réinitialisation de votre mot de passe — MindCraft', html)
}

async function sendPasswordChangedEmail(email, username) {
  const html = buildEmail('Mot de passe modifié', `
    <p style="color:#374151;font-size:14px;line-height:1.7;">Bonjour <strong>${username}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;">Votre mot de passe a été modifié avec succès.</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;">Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement à <a href="mailto:contact@mindcraft-research.fr" style="color:#4F46E5;">contact@mindcraft-research.fr</a>.</p>
  `)
  return sendEmail(email, 'Mot de passe modifié — MindCraft', html)
}

async function sendInvitationEmail(email, senderName, projectName, inviteToken) {
  const url = `${FRONTEND_URL}/auth/login?invite=${encodeURIComponent(inviteToken)}`
  const html = buildEmail('Invitation à collaborer', `
    <p style="color:#374151;font-size:14px;line-height:1.7;">Bonjour,</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;"><strong>${senderName}</strong> vous invite à collaborer sur le projet <strong>« ${projectName} »</strong> sur MindCraft.</p>
    ${ctaButton('Accepter l\'invitation', url)}
    <p style="color:#9ca3af;font-size:12px;">Cette invitation expire dans 48 heures.</p>
  `)
  return sendEmail(email, `Invitation à collaborer sur « ${projectName} » — MindCraft`, html)
}

async function sendFeedbackReplyEmail(email, username, originalType, originalMessage, replyMessage) {
  const typeLabel =
    originalType === 'BUG' ? 'signalement de bug'
    : originalType === 'SUGGESTION' ? 'suggestion'
    : 'demande de fonctionnalité'

  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br/>')

  const url = `${FRONTEND_URL}/dashboard`
  const html = buildEmail(`Réponse à votre ${typeLabel}`, `
    <p style="color:#374151;font-size:14px;line-height:1.7;">Bonjour <strong>${escapeHtml(username)}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;">L'équipe MindCraft a répondu à votre ${typeLabel} :</p>
    <div style="background:#F5F3FF;border-left:3px solid #4F46E5;padding:14px 18px;margin:16px 0;border-radius:6px;">
      <p style="color:#1e3a5f;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${escapeHtml(replyMessage)}</p>
    </div>
    <p style="color:#6b7280;font-size:12px;line-height:1.6;margin-top:20px;"><em>Pour rappel, votre message initial :</em></p>
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:12px 16px;margin:8px 0 20px;border-radius:6px;">
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(originalMessage)}</p>
    </div>
    ${ctaButton('Retrouver mes feedbacks', url)}
    <p style="color:#9ca3af;font-size:12px;">Vous pouvez répondre directement à cet e-mail si nécessaire.</p>
  `)
  return sendEmail(email, `Réponse à votre ${typeLabel} — MindCraft`, html)
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendInvitationEmail,
  sendFeedbackReplyEmail,
}
