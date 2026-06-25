# Pixlane Backend

Node.js serverless backend for the Pixlane Digital marketing site, deployable to Vercel.

**Architecture:**
- `public/index.html` — the static marketing site (served at `/`)
- `api/contacts.js` — `POST /api/contacts`
- `api/briefs.js` — `POST /api/briefs`
- `api/bookings.js` — `POST /api/bookings`
- `lib/supabase.js` — Supabase admin client (server-side only, never bundled to browser)

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values from the [Supabase dashboard](https://supabase.com/dashboard) → Settings → API:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret key (`sb_secret_…`) |

> **Never commit `.env`** — it is listed in `.gitignore`.

### 3. Run locally

```bash
npm run dev
```

This starts `vercel dev` which runs the serverless functions and serves `public/` on `http://localhost:3000`.

### Test an endpoint

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello"}'
```

---

## Deploy to Vercel

### First deploy

```bash
npx vercel
```

Follow the prompts to link or create a Vercel project.

### Set environment variables in Vercel

Either via the CLI:

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

Or in the Vercel dashboard: **Project → Settings → Environment Variables**.

Add both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the **Production** (and optionally Preview) environment.

### Subsequent deploys

```bash
vercel --prod
```

Or push to the linked Git branch — Vercel auto-deploys on push if you connect the repo in the dashboard.

---

## API Reference

All endpoints accept and return `application/json`. On success they return `{ "success": true }` with HTTP 201.

### POST /api/contacts

| Field | Required | Type |
|---|---|---|
| `name` | yes | string |
| `email` | yes | string |
| `message` | yes | string |
| `phone` | no | string |

### POST /api/briefs

| Field | Required | Type |
|---|---|---|
| `name` | yes | string |
| `email` | yes | string |
| `description` | yes | string |
| `project_type` | no | string |
| `budget` | no | string |
| `timeline` | no | string |

### POST /api/bookings

| Field | Required | Type |
|---|---|---|
| `name` | yes | string |
| `email` | yes | string |
| `service` | yes | string |
| `phone` | no | string |
| `preferred_date` | no | string (YYYY-MM-DD) |
| `preferred_time` | no | string (HH:MM) |
| `notes` | no | string |

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — it is used only in `lib/supabase.js` which runs exclusively in serverless functions, never in the browser.
- The static HTML in `public/` must not import or reference `lib/supabase.js`. If you ever need a client-side Supabase connection, use the **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY` convention) with RLS enabled.
- Set `ALLOWED_ORIGIN` in production to restrict CORS to your domain.
