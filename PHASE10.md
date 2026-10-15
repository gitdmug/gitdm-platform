# GITDM Phase 10 — Production hardening

## Staff invitations (`/staff/hr`)
- Principal / Registrar / IT invite staff by email + role + department
- Email sent via Resend when configured
- On login, `/dashboard` auto-accepts pending invitations and attaches roles

## Certificate email
- Issuing a certificate notifies the graduate in-app and by email

## Public announcements on homepage
- Latest PUBLIC notices surface on `/` with link to `/announcements`

## Documentation
- Full `README.md` with local + Vercel deploy steps and journey map
- `.env.example` covers Auth, DB, Pesapal, storage, Google, email

## Version
`2.2.0-phase10`

## Deploy checklist
1. `prisma generate && prisma db push`
2. Seed roles/departments if empty (`npm run db:seed`)
3. Set all env vars from `.env.example`
4. Configure Pesapal IPN → `/api/pesapal/ipn`
5. `next build` / Vercel production deploy
6. Smoke-test: apply → pay fee → admit → pay tuition → open lesson

## Platform complete (Phases 1–10)

Institutional ERP loop for GITDM is operational end-to-end against the blueprint.
Further work is optimisation (UI polish, richer CMS, invigilation, analytics), not missing core workflows.
