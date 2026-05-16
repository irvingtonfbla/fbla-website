# FBLA Admin Dashboard — Handoff Doc

## What was built

A full officer admin dashboard layered on top of the existing Astro 5 / Netlify site at irvingtonfbla.org. Everything existing (link generator, public pages, gallery, etc.) is untouched.

---

## Tech Stack (unchanged from original)

- **Framework:** Astro 5 (static site generator)
- **Hosting:** Netlify
- **Functions:** Netlify Functions (CommonJS, `netlify/functions/`)
- **Data storage:** Netlify Blobs (`@netlify/blobs`) — store name: `fbla-dashboard`
- **Styling:** Scoped CSS in `.astro` files, custom CSS variables
- **Font:** Plus Jakarta Sans (@fontsource)
- **Auth:** Password in `localStorage` (`fbla_admin_pw`), validated against `ADMIN_PASSWORD` env var

---

## New Files Created

### Backend
| File | Purpose |
|---|---|
| `netlify/functions/dashboard.js` | CRUD API for all dashboard data (events, tasks, strikes, minutes, awards) |
| `netlify/functions/package.json` | `{ "type": "commonjs" }` — fixes ESM/CJS conflict in local dev |

### Layouts
| File | Purpose |
|---|---|
| `src/layouts/AdminLayout.astro` | Dark sidebar shell used by all new admin pages. Auth check redirects to `/admin` if not logged in. |

### Admin Pages (officer-only, behind password)
| File | URL | Purpose |
|---|---|---|
| `src/pages/admin/dashboard.astro` | `/admin/dashboard` | Overview hub: stats, upcoming events, open tasks, strike leaderboard |
| `src/pages/admin/calendar.astro` | `/admin/calendar` | Master calendar — monthly grid, color-coded by type, add/edit/delete events |
| `src/pages/admin/tasks.astro` | `/admin/tasks` | Kanban board + list view, strike system (auto-prompts when task marked Missed) |
| `src/pages/admin/minutes.astro` | `/admin/minutes` | Meeting minutes hub — split-pane list + content, filter by type |
| `src/pages/admin/budget.astro` | `/admin/budget` | Budget dashboard — Chart.js bar chart, category breakdown, Google Sheets setup guide |
| `src/pages/admin/awards-admin.astro` | `/admin/awards-admin` | Manage public awards (add/edit/delete/feature) |
| `src/pages/admin/mailing.astro` | `/admin/mailing` | Mailing list stats (mock data + Google Sheets connection guide) |

### Public Pages
| File | URL | Purpose |
|---|---|---|
| `src/pages/awards.astro` | `/awards` | Public awards showcase, pulls from Netlify Blobs, added to main nav |

---

## Modified Files

| File | What changed |
|---|---|
| `src/pages/admin/index.astro` | Added 7 new tool cards for the dashboard sections |
| `src/layouts/Layout.astro` | Added "Awards" link to public nav |
| `netlify.toml` | Fixed `[dev]` config (targetPort/port split), added Google Sheets API to CSP, removed broken `/admin/*` redirect |
| `astro.config.mjs` | Added `server: { port: 4322 }` so Netlify Dev can proxy on 4321 |
| `package.json` | Added `@netlify/blobs` and `chart.js` dependencies |

---

## Deleted / Moved Files

| File | What happened | Why |
|---|---|---|
| `public/admin/index.html` | Moved to `public/cms/index.html` | Was an incomplete Decap CMS setup — conflicted with our admin pages |
| `public/admin/config.yml` | Moved to `public/cms/config.yml` | Same reason |

---

## Auth System

The admin uses the same simple password auth as the existing link generator:

1. User enters password at `/admin`
2. Frontend calls `/.netlify/functions/links` with `Authorization: Bearer {password}`
3. Function checks against `ADMIN_PASSWORD` env var
4. If valid → password saved to `localStorage` as `fbla_admin_pw`
5. Every admin page (via `AdminLayout.astro`) checks localStorage on load — redirects to `/admin` if missing

**Production password:** set in Netlify dashboard → Site settings → Environment variables → `ADMIN_PASSWORD`  
**Local dev password:** set in `.env` → `ADMIN_PASSWORD=sigmafbla67` (gitignored)

---

## Data Layer (Netlify Blobs)

All dashboard data lives in Netlify Blobs under store name `fbla-dashboard`.

**API endpoint:** `/.netlify/functions/dashboard?resource=<name>`

| Resource | Description |
|---|---|
| `events` | Calendar events |
| `tasks` | Task board items |
| `strikes` | Officer strike records |
| `minutes` | Meeting minutes entries |
| `awards` | Competition awards (GET is public, no auth needed) |

All resources support GET (list), POST (create), PUT (update by id), DELETE (delete by id).

---

## Running Locally

```bash
# Requires Netlify CLI
npx netlify dev
```

- Astro dev server runs internally on **port 4322**
- Netlify Dev proxy (with functions) runs on **port 4321**
- Go to **http://localhost:4321/admin** and log in with `ADMIN_PASSWORD` from `.env`

The `.env` file is gitignored — never commit it.

---

## Google Sheets Integration (Budget + Mailing List)

Both pages show mock data now. To connect real data:

**Budget:**
1. Create a Google Sheet with columns: `Category`, `Budget`, `Spent`
2. Enable Google Sheets API in Google Cloud Console, create an API key
3. Make sheet viewable by "Anyone with the link"
4. Add to Netlify env vars: `GOOGLE_SHEETS_API_KEY`, `BUDGET_SHEET_ID`, `BUDGET_SHEET_RANGE` (e.g. `Sheet1!A1:C20`)
5. Create `netlify/functions/sheets-budget.js` that calls `https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}?key={apiKey}` and returns the parsed rows
6. The budget page already tries to fetch from `/.netlify/functions/sheets-budget` and falls back to mock data if it 404s

**Mailing List:** Same pattern — add `MAILING_SHEET_ID` and build a `netlify/functions/sheets-mailing.js`

---

## Deploying

Push to `main` on GitHub → Netlify auto-builds and deploys.

Make sure these env vars are set in the Netlify dashboard:
- `ADMIN_PASSWORD` — officer login password
- `GITHUB_TOKEN` — GitHub PAT with repo write access (needed for link generator)

Netlify Blobs creates its store automatically on first write — no setup needed.

---

## Known Issues / Next Steps

- **Instagram feed:** The user mentioned wanting to showcase Instagram posts. Options: Instagram Basic Display API (requires app approval) or use a third-party embed service. A placeholder exists on the `/awards` page ("Follow us" section).
- **Gallery manager:** Officers can't currently add gallery photos from the dashboard. Would need a GitHub API-based file creator (similar to how the link generator works) or switch to Netlify Blobs for gallery data.
- **Google Sheets functions:** Budget and mailing list show mock data — real functions need to be built (see above).
- **Strike history:** Strikes record which tasks were missed, but there's no UI to view the full history. Could be added to the tasks page.
