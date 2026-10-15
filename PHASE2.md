# GITDM Phase 2 — Finance clearance & programme wizard

Builds on Phase 1. Public pages + auth remain intact.

## What Phase 2 adds

### Finance clearance engine (`src/lib/finance-clearance.ts`)
- Reads configurable thresholds from `ProgrammeRule`:
  - `activationPaymentPercent` (default 60%) → learning access
  - `examPaymentClearancePercent` (default 100%) → exam eligibility
- Statuses: AWAITING_INVOICE, PAYMENT_PENDING, PARTIALLY_PAID, LEARNING_ACCESS_ELIGIBLE, BALANCE_DUE_BEFORE_EXAM, FINANCIALLY_CLEARED, OVERDUE, APPROVED_EXCEPTION
- `settlePayment` / `verifyOfflinePayment` allocate verified payments, issue receipts, advance application-fee workflow, and **re-evaluate Enrollment.accessLevel**
- Student screenshots never auto-settle

### Programme creation wizard
- `/staff/academic` — list all programmes
- `/staff/academic/programmes/new` — full wizard (identity, fees, academic weights, access thresholds, publish)
- `/staff/academic/programmes/[id]` — edit + one-click publish
- Creating/publishing updates the **same records** used by public pages and applications (no hard-coding)
- Public `/programmes` no longer filters by hard-coded `ACTIVE_PROGRAMME_CODES`

### Finance workspace
- `/staff/finance` — invoice queue, outstanding totals, offline payment verification
- Verifying a payment settles the invoice, issues a receipt, and updates student access

### Student finance
- `/student/finance` — clearance snapshot, invoices, receipts
- `/student` home shows access level + outstanding balance + clearance status

## Deploy
Same as Phase 1:
```
prisma generate && prisma db push && next build
```

Schema changes in Phase 1 already cover what Phase 2 needs (optional enrollmentId on Invoice, waiver fields, Programme.tuitionFee, expanded statuses).

## Phase 3 (next)
- LMS: modules, lessons, resources
- Google Meet attendance integration
- Assignments / quizzes basics
- Student Affairs central ticket routing
