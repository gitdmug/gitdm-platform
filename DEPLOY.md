# GITDM deploy fix (Vercel)

## What failed

```
Error: The datasource.url property is required in your Prisma config file when using prisma db push.
```

Cause: the build command ran `prisma db push` during Vercel build. Prisma 7 needs `DATABASE_URL` via `prisma.config.ts`, and schema push should not run on every production build.

## What we changed

1. Added `prisma.config.ts` with `datasource.url = env("DATABASE_URL")` for CLI use.
2. Vercel / `vercel-build` now: **`prisma generate && next build` only**.
3. Run `prisma db push` separately when the schema changes.

## Steps for you

### A. Environment variables on Vercel

Set these for Production (and Preview if you use it):

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes (runtime) |
| `NEON_AUTH_BASE_URL` | Yes |
| `NEON_AUTH_COOKIE_SECRET` | Yes |
| `NEXT_PUBLIC_APP_URL` | Yes (your domain) |
| Pesapal / storage / Resend | As needed |

### B. Push schema once (not during build)

From your machine (or a one-off CI job) with the **same** Neon `DATABASE_URL`:

```bash
cd gitdm-phase1   # or unzip the new zip
export DATABASE_URL="postgresql://USER:PASS@HOST/neondb?sslmode=require"
npx prisma generate
npx prisma db push
# optional first time:
npm run db:seed
```

### C. Redeploy

Upload/redeploy the fixed package (`2.6.1-deploy-fix`). Build should pass without needing `db push` at build time.

### D. After successful deploy

- Open `https://your-domain/api/health` — should report database `ok` if `DATABASE_URL` is set.
- Smoke-test login → dashboard.

## Optional: push schema from Vercel only when needed

Do **not** put `db push` in the permanent build command. If you must, add `DATABASE_URL` to Vercel env **and** accept that every deploy mutates the DB. Prefer local/CI `db push` for schema changes.
