# PAYA Control

Production platform for PAYA's Kitchen Control Center (KCC) — preventive maintenance,
compliance, and field operations for restaurants and commercial kitchens.

This repo follows the build plan in the "PAYA Control Blueprint" proposal. It is a
monorepo with an API and a web app.

```
apps/
  api/    NestJS + Prisma backend
    prisma/               dev schema (SQLite)
    prisma-production/    production schema (PostgreSQL) + migration — see DEPLOYMENT.md
  web/    React + Vite frontend
infra/
  docker-compose.yml           Postgres + Redis, for local Postgres testing
  sql/001_row_level_security.sql   Postgres RLS policies (production only)
Docs/     Original pilot handover documents (business plan, schema notes, SOPs)
render.yaml   Render Blueprint — one-pass deploy, see DEPLOYMENT.md
```

**Want this live on the internet?** See [DEPLOYMENT.md](DEPLOYMENT.md) — deploys to
Render's free tier with Cloudflare R2 for file storage, pointed at a subdomain of an
existing domain (e.g. `app.payaops.com`) without touching the rest of that domain.

## What's built so far

**Milestone 1 — Foundation**
- **Identity & RBAC** — five roles (`ADMIN`, `PROJECT_ENGINEER`, `TECHNICIAN`,
  `CUSTOMER`, `AUTHORITY`), JWT access tokens + httpOnly rotating refresh tokens.
- **Tenant isolation** — every restaurant-scoped query is filtered by the caller's
  actual `RestaurantUserAccess` grants; staff (`ADMIN`/`PROJECT_ENGINEER`) see
  everything, everyone else sees only what they've been granted.
- **Customers → Restaurants → Sections** — multi-location accounts.
- **Equipment registry** with auto-generated QR codes (asset tag + printable PNG).
- **Compliance documents** — upload/download with access-checked streaming.
- **Audit log** — write-once trail of creates/updates/logins/access grants (the
  gap flagged in the build plan's §2 that the original pilot schema didn't have).

**Milestone 2 — Preventive maintenance engine**
- **20 real PM checklist templates**, seeded verbatim from `Docs/PM/*.docx`
  (`apps/api/prisma/pm-checklists.json` is the extracted source of truth) — one
  per `EquipmentType` (a level more specific than `EquipmentCategory`, e.g.
  Refrigeration → Walk-In Cold Room, Blast Chiller & Freezer, Ice Machine…).
- **Equipment registration now selects a type**, which is what determines which
  checklist(s) show up for that asset — exactly the "admin adds equipment →
  the right form becomes available" flow that was asked for.
- **Assignment-gated maintenance** — a `TECHNICIAN` cannot start a checklist on
  their own initiative. `ADMIN`/`PROJECT_ENGINEER` either perform a visit
  themselves ("quick start") or assign one to a specific technician from the
  equipment page, which only lists technicians who already have access to that
  restaurant. An assigned visit shows up as "Assigned to you" on the
  technician's own Dashboard — the in-app "message in his profile" — and
  `/perform-maintenance/:workOrderId` refuses to open for anyone except the
  assignee (or staff).
- **Perform-maintenance page** — technician fills the checklist (the same
  fixed OK/Attention/Critical/N A/Not verified scale as the source documents),
  can flag a defect per line item, and saves in one shot: `WorkOrder` moves
  ASSIGNED → COMPLETED and `WorkOrderTask` rows are created, snapshotting the
  checklist text so history reads correctly even if the template changes later.
- **Corrections after the fact** — "I put something wrong" — the technician
  who performed a visit, or `ADMIN`/`PROJECT_ENGINEER`, can reopen a completed
  `WorkOrder` and fix individual answers without creating a new visit.
- **Findings (`NonConformity`)** raised during a visit are visible on the
  equipment page to `ADMIN` / `PROJECT_ENGINEER` / `CUSTOMER` / `TECHNICIAN`
  (tenant-scoped, same as everything else); `ADMIN`/`PROJECT_ENGINEER` can mark
  one resolved.
- **Visit history** on the equipment page links to a read-only `WorkOrder`
  detail view of everything a technician recorded.
- **Edit & remove for restaurants and equipment** — `ADMIN`/`PROJECT_ENGINEER`
  can edit either; only `ADMIN` can remove one. "Remove" is deliberately not
  always a hard delete: a restaurant or asset with any real history
  (equipment, documents, work orders) is deactivated/retired instead, so
  compliance and maintenance history is never silently destroyed — only a
  genuinely empty record gets actually deleted.

Not built yet (see the build plan's milestones M3–M5): the scheduler that
auto-generates due work orders from a recurring assignment, the engineer-review
→ repair-proposal → customer-approval workflow for corrective work, PDF
reports, notifications, IoT.

## Running it locally

Requires Node.js 20+. Local dev uses **SQLite** (zero install) — Postgres's
installer is blocked on this machine's network, so the schema targets SQLite for
now and Postgres for staging/production (see below).

```bash
npm install                      # installs both apps/api and apps/web

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run prisma:migrate           # creates apps/api/prisma/dev.db
npm run prisma:seed              # demo customer, restaurant, equipment, 4 seeded users

npm run dev:api                  # http://localhost:3001/api
npm run dev:web                  # http://localhost:5173
```

Seeded accounts (password `ChangeMe123!` for all):

| Email | Role |
|---|---|
| `admin@paya.local` | ADMIN |
| `engineer@paya.local` | PROJECT_ENGINEER |
| `tech@paya.local` | TECHNICIAN (scoped to Bam Bam Glòries) |
| `manager@bambam.example` | CUSTOMER (scoped to Bam Bam Glòries) |

## Moving to PostgreSQL (staging/production)

1. In `apps/api/prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"`.
2. Point `DATABASE_URL` at a real Postgres instance (see `infra/docker-compose.yml`
   for a local one, or use a managed instance in production).
3. Re-run `npm run prisma:migrate` to regenerate the migration for Postgres.
4. Apply `infra/sql/001_row_level_security.sql` — this is the database-level
   backstop behind the app-layer tenant scoping (`src/common/tenant-scope.service.ts`).
   It's the defense-in-depth layer from the build plan's §2 (Red: "tenant isolation
   isn't enforced at the data layer") and only makes sense once you're on Postgres.

## Known limitations of this milestone

- File storage is local disk (`apps/api/uploads/`), not yet S3 — swap
  `src/common/storage.service.ts` for an S3-backed implementation behind the
  same interface when you deploy.
- No rate limiting beyond the login endpoint's throttle and a generous global
  default — tighten before opening this up beyond internal use.
- No automated test suite yet — everything above was verified by hand (curl +
  browser) during this build session, not by a CI-enforced test suite. Add
  Jest/Playwright coverage before the review/approval workflow (M3) lands.
