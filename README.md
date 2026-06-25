# Pixlane Backend

Node.js serverless backend for the Pixlane Digital marketing site, deployable to Netlify.

**Architecture:**
- `public/index.html` — the static marketing site (served at `/`)
- `netlify/functions/contacts.js` — `POST /api/contacts`
- `netlify/functions/briefs.js` — `POST /api/briefs`
- `netlify/functions/bookings.js` — `POST /api/bookings`
- `netlify/functions/lib/cors.js` — shared CORS helper (not deployed as a function)
- `lib/supabase.js` — Supabase admin client (server-side only, never bundled to browser)

The `netlify.toml` redirect proxies `/api/:function` → `/.netlify/functions/:function`, so fetch calls in the HTML use plain `/api/contacts` etc. and never need to change.

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

This starts `netlify dev`, which serves `public/` and runs the functions on `http://localhost:8888`. The `/api/*` redirects defined in `netlify.toml` are applied automatically.

### Test an endpoint

```bash
curl -X POST http://localhost:8888/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello"}'
```

---

## Deploy to Netlify

### First deploy

```bash
npx netlify deploy
```

Follow the prompts to link or create a Netlify site.

### Set environment variables in Netlify

Either via the CLI:

```bash
netlify env:set SUPABASE_URL your-project-url
netlify env:set SUPABASE_SERVICE_ROLE_KEY sb_secret_your_key_here
```

Or in the Netlify dashboard: **Site → Site configuration → Environment variables**.

Add both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the **Production** (and optionally Deploy Preview) context.

### Production deploy

```bash
netlify deploy --prod
```

Or push to the linked Git branch — Netlify auto-deploys on push if you connect the repo in the dashboard.

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
- The static HTML in `public/` must not import or reference `lib/supabase.js`. If you ever need a client-side Supabase connection, use the **anon key** with RLS enabled.
- Set `ALLOWED_ORIGIN` in production to restrict CORS to your domain.
