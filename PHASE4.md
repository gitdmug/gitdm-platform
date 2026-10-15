# GITDM Phase 4 — Assessments, grades, certificates

Completes the student journey from learning through award.

## Quizzes
- Staff create quizzes (quick single-question or multi via API)
- Student starts attempt, answers, auto-marked objective questions
- Attempt limits and pass mark enforced
- Routes: `/student/quizzes`, `/student/quizzes/[id]`

## Exams
- Exam window (opensAt / closesAt), attempt limit (default 3)
- **Exam eligibility** checks financial clearance at `examPaymentClearancePercent`
- Routes: `/student/exams`, `/staff/exams`

## Grade calculation
```
Final = (A × wA + Q × wQ + E × wE) / (wA + wQ + wE)
```
Weights from `ProgrammeRule` (default 30 / 20 / 50). Pass mark configurable.
- `/student/grades` recalculates and displays provisional results

## Certificates & transcripts
- Eligibility: all published courses passed **and** financially cleared
- Issue certificate → unique number, verification record, enrolment COMPLETED
- Generate official transcript with course entries
- **Public verification**: `/verify/[certificateNumber]` — minimal disclosure only

## Staff
- `/staff/exams` — publish exams/quizzes, issue certificates, generate transcripts

## Deploy
```
prisma generate && prisma db push && next build
```
