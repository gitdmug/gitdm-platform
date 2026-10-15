# GITDM Phase 14 — Resilience UI, status tracker, Vercel config

## Global error & loading
- `src/app/error.tsx` — recoverable error boundary with try-again
- `src/app/loading.tsx` — consistent loading spinner

## Application status tracker
- `/admissions/status` — progress chips: Submitted → Documents → Fee → Review → Decision
- Linked from applicant portal

## Vercel
- `vercel.json` with `prisma generate && prisma db push && next build`
- Region hint: `fra1` (adjust for your deployment)

## Deploy
```
npm install
npx prisma generate
npx prisma db push
npm run build
```

Or push to Vercel with env vars from `.env.example`.
