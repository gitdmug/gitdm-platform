# GITDM Phase 12 — Search, legacy redirects, SEO, offline pay guide

## Site search (`/search`)
- Programmes, courses, and notices (min 2 characters)
- Linked from workspace header search form

## Legacy URL redirects
| Old | New |
|-----|-----|
| `/campus` | `/student` |
| `/campus/*` | mapped student routes |
| `/control-centre` | `/staff/principal` or `/staff` |
| `/control-centre/*` | mapped staff routes |

Header workspace links updated to the new route structure.

## SEO
- `robots.ts` — allow public, disallow private portals
- `sitemap.ts` — static pages + published programmes

## Offline payment guide
- `/student/finance/offline` — instructions + open invoice list with references

## Deploy
```
prisma generate && prisma db push && next build
```
