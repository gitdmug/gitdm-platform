# GITDM Phase 6 — Payments, profile, notifications, quiz builder, IT

## Online payments (Pesapal)
- Student **Pay online** on `/student/finance` for unpaid invoices
- Creates PENDING payment, redirects to Pesapal
- Callback: `/api/pesapal/callback` — settles, advances application fee, reevaluates access
- IPN: `/api/pesapal/ipn` — same settlement (idempotent)
- Offline verification remains in Finance workspace
- Graceful error when Pesapal limit/config fails (message directs to bank/MM + invoice ref)

## Document upload API
- `POST /api/upload` — authenticated; optional `applicationId` + `documentType` creates `ApplicationDocument`
- Uses existing Neon object storage (`neonfile:` refs)

## Profile — `/student/profile`
- Name, phone, DOB, nationality, address, emergency contacts
- Upserts `Profile` record

## Notifications — `/student/notifications`
- In-app list, mark all read
- Fed by admissions, finance, support, system events

## Multi-question quiz builder — `/staff/exams/quiz-builder`
- Up to 5 questions in the form UI (engine supports 20)
- Options, correct answer, marks, pass %, attempts, time limit

## IT health — `/staff/it`
- DB connectivity, env presence for Auth, storage, email, Pesapal, Google Meet
- **Never shows secret values**

## Deploy
```
prisma generate && prisma db push && next build
```

Ensure Vercel env includes Pesapal + IPN URL pointing at `/api/pesapal/ipn`.
