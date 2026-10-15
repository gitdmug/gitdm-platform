# GITDM Phase 8 — Parent portal, applicant pay, exam marking, announcements

## Parent / Guardian portal (`/parent`)
- Registrar links parent email → student user ID
- Parent sees programme, clearance %, outstanding balance, course grades
- Read-only; no grade or payment mutation
- Dashboard routes PARENT / GUARDIAN roles here

## Applicant online fee payment
- **Pay application fee online** on `/applicant` when status is FEE_PENDING
- Uses same Pesapal flow; callback returns to applicant portal
- Advances FEE_PENDING → UNDER_REVIEW on success

## Exam marking queue (`/staff/exams/marking`)
- Lists MANUAL_REVIEW / SUBMITTED attempts
- Per-question marks + feedback
- Finalises score and notifies student

## Public announcements (`/announcements`)
- Published ALL / PUBLIC notices for website visitors

## Deploy
```
prisma generate && prisma db push && next build
```
