# Plan: Comprehensive Email System with Resend for MindCraft

## Overview

Implement a full email system using the Resend API (replacing unused nodemailer/Brevo) to support email verification, password reset, project invitations, welcome messages, and password-change notifications.

---

## Part 1: Prisma Schema Changes

File: backend/prisma/schema.prisma

Add three fields to User model (after resetTokenExpires on line 17):
- emailVerified Boolean @default(false)
- verificationToken String?
- verificationTokenExp DateTime?

emailVerified defaults to false. New users must verify before logging in. Tokens are bcrypt-hashed before storage. Expiry is 24 hours.

After editing run: npx prisma db push

---

## Part 2: Backend New Email Service

File (NEW): backend/src/lib/email.js

2.1 Resend Client Setup: new Resend(process.env.RESEND_API_KEY), FROM from EMAIL_FROM env, FRONTEND_URL from env.

2.2 Base HTML Template: buildEmail(title, bodyHtml) with inline CSS, MindCraft header (#4F46E5), CTA button, footer.

2.3 Five Email Functions (each returns {success, error?}):
1. sendVerificationEmail(email, username, token) - 24h expiry
2. sendPasswordResetEmail(email, username, token) - 1h expiry
3. sendWelcomeEmail(email, username)
4. sendPasswordChangedEmail(email, username)
5. sendInvitationEmail(email, senderName, projectName, inviteToken)

2.4 Graceful Degradation: if no API key, log warning, return {success:false}. Never throw.

---

## Part 3: Backend Auth Route Changes

File: backend/src/routes/auth.js

3.1 Registration (POST /register): Create user with emailVerified:false. Generate+hash verification token. Send verification email. Do NOT generate JWT. Return {message, emailSent}. Still create demo study.

3.2 Login (POST /login): After password check, before 2FA: if (!user.emailVerified) return 403 with {error, emailNotVerified:true, email}.

3.3 New Route: POST /verify-email - Accept token, find users with valid verificationTokenExp, bcrypt.compare, set emailVerified:true, send welcome email.

3.4 New Route: POST /resend-verification - Accept email, rate-limit (1hr cooldown), generic response.

3.5 Fix: POST /reset-password - BUG at line 379: findFirst does not filter by user. FIX: Add email to schema, filter by email AND resetTokenExpires.

3.6 Forgot Password: Replace TODO at line 368 with sendPasswordResetEmail().

3.7 Change Password: After update, fire-and-forget sendPasswordChangedEmail().

---

## Part 4: Backend Project Route Changes

File: backend/src/routes/projects.js

Invite Route (POST /:id/invite): Replace TODO at line 206 with sendInvitationEmail(email, project.owner.username, project.name, invitation.token).

---

## Part 5: Environment Configuration

- backend/.env.example: Replace Brevo SMTP section with RESEND_API_KEY and EMAIL_FROM
- backend/package.json: Remove nodemailer, add resend ^4.0.0
- backend/.env: Add actual RESEND_API_KEY value

---

## Part 6: Frontend New Pages

6.1 Forgot Password (NEW): frontend/src/pages/auth/forgot-password.jsx
- Split screen layout, email input, POST /api/auth/forgot-password, generic success.

6.2 Reset Password (NEW): frontend/src/pages/auth/reset-password.jsx
- Extract token+email from router.query. Password+confirm inputs. POST /reset-password.

6.3 Verify Email (NEW): frontend/src/pages/auth/verify-email.jsx
- On mount, POST /verify-email with token. Loading/success/error states. Resend option.

6.4 Login Modifications: frontend/src/pages/auth/login.jsx
- Handle emailNotVerified response, show resend button.

6.5 Register Modifications: frontend/src/pages/auth/register.jsx
- Show check-your-email screen instead of redirecting to dashboard.

6.6 Auth Store: frontend/src/lib/authStore.js
- register function: remove localStorage.setItem and set({user, isAuthenticated}). Just POST and return.

---

## Part 7: Implementation Sequence

Step 1 Foundation: 1. schema.prisma 2. prisma db push 3. email.js 4. package.json 5. .env
Step 2 Backend: 6-13 (route changes)
Step 3 Frontend: 14-19 (pages and store)
Step 4 Testing: 20-25 (all flows, rate limiting, graceful degradation, migration)

---

## Part 8: Important Considerations

8.1 Existing Users: RUN UPDATE users SET emailVerified = true; to grandfather them.
8.2 Resend Free Tier: 100/day, 3000/month. 1-hour cooldown on resend-verification.
8.3 DNS: Verify mindcraft-research.fr in Resend (SPF, DKIM, DMARC). Use onboarding@resend.dev for testing.
8.4 Security: Tokens bcrypt-hashed. Verification 24h, reset 1h. Generic responses prevent enumeration.
8.5 Token Flow: Email links open frontend SPA pages with token as query param. Page POSTs to backend API.