# Deploying PAYA Control to payaops.com

This walks through putting the app live at `app.payaops.com`, on Render's free tier,
without touching your existing marketing site at `payaops.com`. Everything Render can
automate is wired up in `render.yaml`; the steps below are the parts that need your
own accounts and credentials, which I don't have access to.

**Before you start:** the free tier has two real limitations worth knowing up front —
the API server spins down after 15 minutes idle (next request takes ~30-50s to wake it),
and the free Postgres database is deleted 30 days after creation unless you upgrade it.
Both are fine for evaluation; see the end of this doc for the ~$14/mo upgrade path once
you're ready for real day-to-day use.

## 1. Push this repo to GitHub

Render deploys from a GitHub (or GitLab) repo. If you don't already have one for this
project:

```bash
git add -A
git commit -m "Initial commit — PAYA Control"
```

Then create an empty repo on GitHub (github.com → New repository — don't initialize it
with a README), and push:

```bash
git remote add origin https://github.com/<your-username>/paya-control.git
git branch -M main
git push -u origin main
```

## 2. Create the Cloudflare R2 bucket (free file storage)

Do this before deploying so the credentials are ready to paste in:

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free) if you don't
   already have an account.
2. In the sidebar, go to **R2 Object Storage** → **Create bucket**. Name it
   `paya-control-documents`, leave the default region.
3. Go to **Manage API tokens** (top right of the R2 page) → **Create API token**.
   Scope it to **Object Read & Write**, restricted to just this bucket. Save the
   **Access Key ID** and **Secret Access Key** it shows you — R2 only shows the secret
   once.
4. Note your **Account ID**, shown on the R2 overview page. Your S3 endpoint is:
   `https://<account-id>.r2.cloudflarestorage.com`

## 3. Deploy the Blueprint on Render

1. Sign up at [render.com](https://render.com) (free) and connect your GitHub account.
2. **New +** → **Blueprint** → pick the repo you pushed in step 1. Render reads
   `render.yaml` and shows you two services (`paya-control-api`, `paya-control-web`) and
   one database (`paya-control-db`) — click **Apply**.
3. Render starts building both services. This first build **will fail to boot cleanly**
   — that's expected, because a few secrets in `render.yaml` are deliberately left blank
   for you to fill in (Render marks these `sync: false`). Don't worry about the failure yet.
4. Open the `paya-control-api` service → **Environment** tab, and fill in:
   - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — from step 2
   - `SEED_ADMIN_EMAIL` — the real email you'll log in with
   - `SEED_ADMIN_PASSWORD` — a real password (the app refuses to boot without this set)
5. Save, which triggers a redeploy. Watch the **Logs** tab — you should see
   `PAYA Control API listening on ...` once it's up.

## 4. Point the two apps at each other

Render gives each service a `*.onrender.com` URL immediately (e.g.
`paya-control-api-xyz1.onrender.com`, `paya-control-web-abc2.onrender.com`) — find these
on each service's page. `render.yaml` initially points them at the final custom-domain
URLs, which don't exist yet, so:

1. On `paya-control-web` → **Environment**, set `VITE_API_URL` to
   `https://paya-control-api-xyz1.onrender.com/api` (your actual API URL + `/api`), then
   **Manual Deploy** → **Deploy latest commit** (static sites need a rebuild to pick up a
   changed env var, since it's baked in at build time).
2. On `paya-control-api` → **Environment**, set `WEB_ORIGIN` and `PUBLIC_APP_URL` to your
   actual web URL, e.g. `https://paya-control-web-abc2.onrender.com`. This redeploys
   automatically.
3. Open the web URL — you should reach the PAYA Control login page and be able to sign in
   with the admin email/password you set in step 3.4.

## 5. Attach your domain

Keep `payaops.com` itself pointed at your existing marketing site — don't touch that DNS
record. We're only adding a new subdomain.

1. On `paya-control-web` → **Settings** → **Custom Domains** → **Add Custom Domain** →
   enter `app.payaops.com`. Render shows you a DNS record to add (a `CNAME` pointing at
   your Render URL).
2. On `paya-control-api` → same thing, but with `api.payaops.com`.
3. Go to wherever `payaops.com` is registered (or wherever its DNS is managed — check
   your registrar's dashboard) and add the two `CNAME` records Render gave you. SSL
   certificates are issued automatically by Render once DNS propagates (usually minutes,
   occasionally up to a few hours).
4. Once both domains show "Verified" in Render, update the same two environment
   variables from step 4 to the real domains instead of the `*.onrender.com` ones:
   - `paya-control-web` → `VITE_API_URL=https://api.payaops.com/api` → redeploy
   - `paya-control-api` → `WEB_ORIGIN` / `PUBLIC_APP_URL` = `https://app.payaops.com`

## 6. First login

Go to `https://app.payaops.com` and sign in with the admin email/password from step 3.4.
From there: **Users** page to create real accounts for your project engineer,
technicians, and restaurant managers, and **Customers** to start registering real
restaurants and equipment.

The 20 PM checklist templates, equipment categories/types, and roles are already seeded
— that seeding step re-runs (harmlessly — it's all upserts) on every deploy, so it stays
in sync if you ever update the checklist source data.

## What's still local-only after this

- **Backups**: Render's free Postgres has no backup feature and is deleted after 30
  days. If you're accumulating real data you care about, either upgrade to a paid
  Postgres plan (Starter, ~$7/mo, includes daily backups) before day 30, or export data
  periodically (`pg_dump $DATABASE_URL > backup.sql` — run from a machine with `psql`
  installed and the connection string from Render's database page).
- **Cold starts**: the free API service sleeps after 15 minutes of no traffic. A
  technician's first request after a quiet period waits ~30-50s. Upgrading
  `paya-control-api` to the Starter plan (~$7/mo) removes this.

Total to remove both of those: **~$14/mo** — edit the `plan:` fields in `render.yaml`
from `free` to `starter` (or change it in the Render dashboard directly, which also
works and doesn't require a redeploy).
