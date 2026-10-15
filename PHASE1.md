# GITDM Phase 1 — Admissions & Access Foundation

This package rebuilds the authenticated side of the platform around the institutional blueprint while **keeping public pages and authentication intact**.

## What Phase 1 delivers

### Schema (Prisma)
- Expanded `ApplicationStatus`: DRAFT → FEE_PENDING → UNDER_REVIEW → INTERVIEW_SCHEDULED → ADMITTED / REJECTED / DEFERRED / APPEAL_PENDING …
- Expanded `DocumentType`: IDENTITY, PASSPORT, DRIVERS_LICENCE, VOTER_SLIP, EDUCATION_CERTIFICATE, PASSPORT_PHOTO, …
- `Invoice.enrollmentId` is now optional (supports pure application-fee invoices).
- `Invoice` supports authorised fee waiver (`waived`, `waiverReason`, `waivedById`, `waivedAt`).
- `Programme` gains `tuitionFee`, `awardTitle`, `deliveryMode`, `entryRequirements`, `learningOutcomes` so programmes are fully data-driven.

### Critical business rules enforced
1. **Application fee before decision** — Staff cannot record ACCEPTED / REJECTED / CONDITIONAL until the application-fee invoice is PAID or explicitly waived with a reason.
2. **Required documents** — Identity document + passport photo must be uploaded before submission.
3. **One programme at a time** — A student cannot hold two concurrent ACTIVE/REPEATING enrolments (documented short-course exception retained).
4. **No hard-coded programme catalogue for applications** — Open programmes are selected from the database (`status = PUBLISHED`, `applicationsOpen = true`).

### New / rebuilt routes
| Route | Purpose |
|-------|---------|
| `/dashboard` | Single post-login router (staff → workspace, applicant → `/applicant`, enrolled → `/student`) |
| `/applicant` | Clean applicant dashboard (status, fee, documents, continue application) |
| `/student` | Clean student entry (enrolment + balance; LMS arrives in Phase 2/3) |
| `/staff` | Control Centre home with role-filtered workspaces |
| `/staff/admissions` | Application queue with filters and fee-settled indicators |
| `/staff/admissions/[id]` | Full application review, document view, fee waiver, decision + enrolment handover |

### Public + Auth (preserved)
- `/`, `/about`, `/admissions`, `/admissions/apply`, `/programmes`, `/contact`, `/partners`, `/research/*`
- `/auth/sign-in`, `/auth/signup`, `/auth/verify-email`, `/auth/login`, `/auth/logout`
- Neon Auth integration, existing lib helpers

### Enrolment handover
When Admissions records ACCEPTED or CONDITIONAL:
1. Decision is stored with actor + reason.
2. Application status → ADMITTED.
3. Enrolment is created or updated (`admittedAt` set).
4. Tuition invoice is generated when `programme.tuitionFee > 0`.

## Deploy on Vercel

1. Set the same environment variables as production (see `.env.example`).
2. `DATABASE_URL` must point at the existing Neon database.
3. Build command (recommended):
   ```
   prisma generate && prisma db push && next build
   ```
   (`db push` will apply the additive schema changes: new enum values, optional enrollmentId, new Programme fields, waiver columns). Existing data is preserved.
4. After first deploy, verify:
   - Public pages load
   - Sign-in still works
   - `/dashboard` routes correctly
   - An admissions user can open `/staff/admissions` and see live applications
   - Decision is blocked when fee is unpaid

## What is intentionally deferred (Phase 2+)
- Full LMS (modules, lessons, resources)
- Google Meet attendance integration
- Finance workspace (reconciliation, clearance engine beyond basic invoices)
- Exams, Student Affairs ticket routing, Library, Marketing CMS
- Programme creation wizard that immediately publishes to public pages
- Complete removal of remaining hard-coded catalogue references in non-admissions paths

## Existing data
You currently have applicants under review and paid students. Phase 1 is additive and maps to the same tables. Existing `ACCEPTED` statuses remain valid; new applications will use `FEE_PENDING` / `ADMITTED` as appropriate.
