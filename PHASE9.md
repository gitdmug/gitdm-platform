# GITDM Phase 9 — Student numbers, email notify, content builder, requests, receipts

## Student numbers
- Assigned on admission: `{PROGRAMME_CODE}/{YY}/{RAND}`
- Shown on student portal and registrar register
- Unique on Enrollment

## Dual-channel notifications
- `notifyUser()` creates in-app notification and sends branded email via Resend when configured
- Wired to admission decisions (offer / rejection)

## Lecturer content builder
- `/staff/lecturer/content` — create CourseModule + Lesson (reading/video)

## Academic requests
- `/student/requests` — deferment, withdrawal, or other academic requests
- Routed as support tickets to Student Affairs

## Printable receipts
- `/student/receipts/[paymentId]` — official receipt view with print
- Linked from student finance when a completed payment exists

## Schema
- `Enrollment.studentNumber String? @unique`

## Deploy
```
prisma generate && prisma db push && next build
```
