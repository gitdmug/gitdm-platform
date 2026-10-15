# GITDM Phase 13 — Trading floor, store, audit export, 404

## Trading Floor (`/trading-floor`)
- Public facility page (no more dead header link)
- Points applicants to apply / contact

## Store (`/store`)
- Lightweight landing; directs to programmes and student library

## Audit export
- UI: `/staff/principal/audit` — filterable audit table
- CSV: `GET /api/audit/export?days=30` (Principal / Academic Director only)

## Global 404
- Branded `not-found` with links home and to dashboard

## Deploy
```
prisma generate && prisma db push && next build
```
