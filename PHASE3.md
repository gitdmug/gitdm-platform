# GITDM Phase 3 — LMS, attendance, assignments, Student Affairs

## Learning management
- `/student/learn` — course → module → lesson catalogue (gated by finance clearance)
- `/student/learn/[lessonId]` — content, video, resources, mark complete
- Lecturer workspace: create modules, lessons, publish, create assignments
- Progress stored in `LessonProgress`

## Live classes + Google Meet
- Lecturer schedules classes (`TimetableEvent`) with optional auto Meet space
- Lecturer can paste Meet URL if auto-create unavailable
- Student **checks in via GITDM** before Meet opens (`ClassAttendanceRecord`)
- Heartbeat fallback for duration; **Reconcile Meet attendance** pulls Google Meet participants when Workspace is configured
- Access gated by same learning-access threshold as lessons

## Assignments
- Lecturer creates/publishes assignments per course
- `/student/assignments` — view, submit text or file URL, see feedback/score
- Late submissions marked LATE

## Student Affairs (central tickets)
- All student tickets → `/student/support` → Student Affairs queue
- Categories: ACADEMIC, WELFARE, ADMINISTRATIVE, TECHNICAL, FINANCE, GENERAL
- `/staff/student-affairs` — open queue, reply, status (IN_PROGRESS / WAITING / RESOLVED / CLOSED)
- Notifications to student + SA staff

## Schema
- `SupportTicket.category`, `staffReply`, `resolvedAt` (additive)

## Env for Meet
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_WORKSPACE_IMPERSONATE_EMAIL=
```

## Deploy
```
prisma generate && prisma db push && next build
```
