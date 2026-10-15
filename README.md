# GITDM Platform

Global Institute of Trading and Derivatives Markets — institutional web application rebuilt against the Portal & Operations Blueprint.

**Version:** 2.6.1 (deploy fix)

## Stack

- Next.js 16 (App Router)
- Prisma + PostgreSQL (Neon)
- Neon Auth
- Pesapal payments
- Google Meet attendance (optional)
- Resend email (optional)
- Neon Object Storage / S3-compatible uploads

## Quick start (local)

```bash
cp .env.example .env.local
# Fill DATABASE_URL, auth, Pesapal, storage keys

npm install
npx prisma generate
npx prisma db push
npm run db:seed   # optional institutional roles/seed
npm run dev
```

## Vercel deploy

**Important:** the Vercel build runs only `prisma generate && next build`.
It does **not** run `prisma db push` (that needs `DATABASE_URL` and should not run on every deploy).

1. In Vercel → Project → Settings → Environment Variables, set at least:
   - `DATABASE_URL` (Neon connection string, used at **runtime**)
   - Auth, Pesapal, storage keys as in `.env.example`
2. Push schema once (local or one-off), with `DATABASE_URL` set:

```bash
export DATABASE_URL="postgresql://..."
npx prisma db push
# optional: npm run db:seed
```

3. Deploy. Build command is:

```bash
prisma generate && next build
```

## Vercel deploy (archive note)

1. Import the repository / upload this project.
2. Set environment variables from `.env.example`.
3. Build command (already in `package.json`):

```bash
prisma generate && prisma db push && next build
```

Or use the script:

```bash
npm run vercel-build
```

4. Point Pesapal IPN to `https://your-domain/api/pesapal/ipn`.

## Core journeys

| Actor | Path |
|-------|------|
| Public | Programmes → Apply |
| Applicant | Documents → Application fee (Pesapal) → Review |
| Admissions | Fee gate → Decision → Enrolment + student number |
| Student | Pay tuition → Learn → Classes (Meet) → Assignments / Quizzes / Exams |
| Finance | Verify offline payments · Clearance thresholds |
| Lecturer | Content · Classes · Marking |
| Exams | Publish · Mark · Certificates |
| Registrar | Records · Parent links · Status |
| Parent | Progress & finance summary |
| Alumni | Certificates · Verify |
| Principal | Institutional metrics |

## Key routes

- `/` public site  
- `/admissions/apply` applications  
- `/applicant` applicant portal  
- `/student/*` student portal  
- `/staff/*` staff control centre  
- `/parent` guardian portal  
- `/alumni` alumni  
- `/verify/[number]` certificate verification  
- `/announcements` public notices  
- `/api/pesapal/callback` · `/api/pesapal/ipn`

## Blueprint rules enforced

1. Application fee before admission decision  
2. Identity + passport photo documents  
3. One primary programme per student (short-course exception documented)  
4. Financial clearance gates learning / exam access  
5. Programmes created in wizard drive public catalogue and student journey  
6. Support tickets centralise to Student Affairs  
7. No hard-coded catalogue codes for status logic  

## Phases 1–10

See `PHASE1.md` … `PHASE10.md` for incremental change logs.

## Production extras (Phase 14)

- Global `error.tsx` / `loading.tsx` for resilient UX
- `/admissions/status` — application progress tracker for signed-in applicants
- `vercel.json` — explicit build command for Vercel
- `/api/health` — uptime probe

## Support

Operational email: use institutional mailboxes configured in branding / env.
