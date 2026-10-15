# GITDM Phase 5 — Registrar, Leadership, Library, Announcements

## Registrar (`/staff/registrar`)
- Searchable student enrolment register
- Activate PENDING → ACTIVE
- Status changes (SUSPENDED, WITHDRAWN, COMPLETED, REPEATING) with **required reason** and audit trail
- Does not alter marks or payments

## Principal / Leadership (`/staff/principal`)
- Live institutional metrics: applications, enrolments, fees collected/outstanding, tickets, certificates
- Breakdown by application and enrolment status
- Recent audit log stream
- Quick links to operational workspaces

## Library
- Staff (`/staff/library`): add resources with access scope PUBLIC / CAMPUS / ENROLLED
- Student (`/student/library`): campus catalogue + published announcements

## Marketing / Announcements (`/staff/marketing`)
- Publish announcements to ALL / STUDENTS / STAFF / PUBLIC
- Optional expiry date
- Shown on student library page

## Control Centre
All workspaces listed with role filters:
Leadership · Admissions · Finance · Registrar · Academic · Lecturer · Exams · Student Affairs · Library · Marketing

## Schema (additive)
- `LibraryResource.accessScope`, `programmeId`, `createdAt`
- `Announcement.expiresAt`, `createdById`, default audience

## Deploy
```
prisma generate && prisma db push && next build
```
