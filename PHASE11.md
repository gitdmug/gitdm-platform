# GITDM Phase 11 — Grade book, student ID, health probe

## Grade book (`/staff/exams/grades`)
- Per-course roster with assignment / quiz / exam / total percentages
- Recalculate grades from live assessment data
- **Finalise** provisional grades (notifies student by email + in-app)

## Digital student ID (`/student/id-card`)
- Printable card: name, student number, programme, status, access level
- Uses profile photo when available

## Public navigation
- Header includes **Notices** → `/announcements`

## Health probe
- `GET /api/health` — database + integration readiness (no secrets)
- Returns 200 healthy / 503 degraded for uptime monitors

## Deploy
```
prisma generate && prisma db push && next build
```

Monitor: `https://your-domain/api/health`
