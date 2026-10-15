# GITDM Phase 7 — Marking, exam taking, alumni, calendar, course linkage

## Assignment marking
- `/staff/lecturer/marking` — filter by course, grade submissions with feedback
- Student notified on grade
- Linked from lecturer workspace

## Exam taking
- `/student/exams/[examId]` — start attempt, answer objective/essay questions, submit
- Auto-mark where correct answers exist; otherwise MANUAL_REVIEW
- List page links to exam room

## Programme → course linkage
- Creating a programme also creates a default published course (`{CODE}-CORE`)
- Publishing a programme ensures at least one course exists
- Admission decision auto-enrols the student on all published programme courses

## Academic calendar
- `/student/calendar` — unified timeline of classes, assignment due dates, exams

## Alumni portal
- `/alumni` — completed programmes, issued certificates, public verify links
- Dashboard routes completed-only users here

## Deploy
```
prisma generate && prisma db push && next build
```
