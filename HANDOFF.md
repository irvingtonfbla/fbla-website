# FBLA Admin Dashboard — Handoff Doc

**Last updated:** May 2026  
**Repo:** github.com/irvingtonfbla/fbla-website  
**Live site:** irvingtonfbla.org  
**Stack:** Astro 5 · Netlify · Netlify Functions (CommonJS) · Netlify Blobs

---

## What exists

A full officer admin dashboard layered on top of the existing Astro 5 / Netlify site. All original public pages (gallery, about, link generator, etc.) are untouched.

---

## File map

### Backend
| File | Purpose |
|---|---|
| `netlify/functions/dashboard.js` | CRUD API for all dashboard data. Supports GET/POST/PUT/DELETE for every resource. Has a **local file fallback** — when Netlify Blobs isn't configured (local dev without `netlify link`), it stores JSON in `.netlify/blobs-local/` automatically. |
| `netlify/functions/links.js` | Original link generator API. Reads/writes `src/data/redirects.json` via GitHub API. Requires `GITHUB_TOKEN`. |
| `netlify/functions/package.json` | `{ "type": "commonjs" }` — fixes ESM/CJS conflict in Netlify Functions. |

### Layout
| File | Purpose |
|---|---|
| `src/layouts/AdminLayout.astro` | Dark sidebar shell used by all admin pages. Checks `localStorage.fbla_admin_pw` on load — redirects to `/admin` if missing. |

### Admin pages (all behind password)
| File | URL | Purpose |
|---|---|---|
| `src/pages/admin/index.astro` | `/admin` | Login gate + tool card grid. **Auto-authenticates on localhost** (no password needed for local dev). |
| `src/pages/admin/dashboard.astro` | `/admin/dashboard` | Overview hub: stats, upcoming events, open tasks, strike leaderboard |
| `src/pages/admin/calendar.astro` | `/admin/calendar` | Monthly calendar grid, color-coded by event type, add/edit/delete |
| `src/pages/admin/tasks.astro` | `/admin/tasks` | **Spreadsheet-style task table** (default) + kanban board toggle. Columns: Date · Deadline · Task · Description · Lead Officer · Other Officers · Location. Color-coded rows: green=done, yellow=in progress, red=missed, white=not started. Strike auto-prompt when marked Missed. |
| `src/pages/admin/roster.astro` | `/admin/roster` | All FBLA members for the year. Fields: name, role, email, grade, notes. **Strikes column** shows SVG tally marks (groups of 5 with diagonal). Loads strike data in parallel — matches by full name then first name. |
| `src/pages/admin/minutes.astro` | `/admin/minutes` | Meeting minutes — split-pane list + content view, filter by type |
| `src/pages/admin/budget.astro` | `/admin/budget` | Budget dashboard with Chart.js bar chart. Mock data now; falls back to mock if `sheets-budget` function 404s. |
| `src/pages/admin/awards-admin.astro` | `/admin/awards-admin` | Manage public awards (add/edit/delete/feature) |

### Public pages
| File | URL | Purpose |
|---|---|---|
| `src/pages/awards.astro` | `/awards` | Public awards showcase, pulls from Netlify Blobs |

---

## Data layer

All dashboard data is stored in **Netlify Blobs**, store name `fbla-dashboard`.

**API:** `/.netlify/functions/dashboard?resource=<name>`  
All resources support GET · POST · PUT (by id) · DELETE (by id).

| Resource | Fields stored |
|---|---|
| `events` | title, date, endDate, type, description, location, color |
| `tasks` | title, description, leadOfficer, otherOfficers[], deadline, dateAdded, status, location |
| `strikes` | officerName, count, history[] |
| `minutes` | title, date, type, content |
| `awards` | title, event, placement, year, description, featured |
| `roster` | firstName, lastName, role, grade, email, notes |

Awards GET is public (no auth). All other operations require `Authorization: Bearer <password>`.

### Local dev fallback
`dashboard.js` detects when Blobs isn't configured and falls back to local JSON files in `.netlify/blobs-local/fbla-dashboard/` (one file per resource). This folder is gitignored via `.netlify`. No `netlify link` needed for local dev.

---

## Auth system

1. User goes to `/admin`
2. **On localhost:** auto-authenticates with `sigmafbla67`, skips network call entirely
3. **On production:** calls `/.netlify/functions/dashboard?resource=events` with the entered password. Returns 200 → saves to `localStorage.fbla_admin_pw`. Returns 401 → shows "Wrong password".
4. Every admin page (`AdminLayout.astro`) checks localStorage on load — redirects to `/admin` if missing.

**Production password:** Netlify dashboard → Site settings → Environment variables → `ADMIN_PASSWORD`  
**Local dev password:** `.env` → `ADMIN_PASSWORD=sigmafbla67` (gitignored, never commit)

---

## Running locally

```bash
npx netlify dev
```

- Astro dev server: **port 4322** (internal)
- Netlify Dev proxy (with functions): **port 4321** ← use this one
- Go to `http://localhost:4321/admin` — login is automatic on localhost
- Data is stored locally in `.netlify/blobs-local/` and persists between restarts

---

## Task board specifics

The task board was rebuilt from kanban to match the existing Google Sheet workflow.

**Data fields per task:**
- `title` — task name
- `description` — details, times, links
- `leadOfficer` — primary person responsible (string, typed manually or from roster autocomplete)
- `otherOfficers` — array of strings (comma-separated in the form)
- `deadline` — date string `YYYY-MM-DD`
- `dateAdded` — auto-set on creation
- `status` — `not-started` | `in-progress` | `done` | `missed`
- `location` — `""` | `In-person` | `Online`

**Backward compat:** Old tasks that used `assignedTo[]` still render — first element shows as Lead Officer, rest as Other Officers.

**Strikes:** When a task is marked Missed, the function prompts to add strikes to `leadOfficer` + all `otherOfficers`. Strike records store `officerName`, `count`, and a `history[]` array of `{ taskId, taskTitle, date }`.

---

## Roster + strikes

Roster members: `firstName`, `lastName`, `role`, `grade`, `email`, `notes`.

Roles: `President` · `Vice President` · `Secretary` · `Treasurer` · `Reporter` · `Parliamentarian` · `Historian` · `Officer` · `Member`

Officers (non-Member roles) sort to the top. Tally marks are SVG — groups of 5 shown with a diagonal slash through 4 vertical bars.

Strike matching: looks up `"${firstName} ${lastName}"` in the strikes map first, then falls back to `firstName` alone (for tasks created before the roster existed).

---

## Deploying

Push to `main` → Netlify auto-builds and deploys.

**Required env vars in Netlify dashboard:**
- `ADMIN_PASSWORD` — officer login password
- `GITHUB_TOKEN` — GitHub PAT with repo write access (for link generator)

Optional (for budget):
- `GOOGLE_SHEETS_API_KEY`
- `BUDGET_SHEET_ID`
- `BUDGET_SHEET_RANGE` (e.g. `Sheet1!A1:C20`)

Netlify Blobs auto-creates its store on first write — no setup needed.

---

## What still needs to be built

| Feature | Notes |
|---|---|
| **Budget — real data** | Build `netlify/functions/sheets-budget.js` that calls Google Sheets API. Page already tries to fetch it and falls back to mock if 404. Needs `GOOGLE_SHEETS_API_KEY` + `BUDGET_SHEET_ID` in Netlify env vars. |
| **Budget — pie chart** | Replace/supplement the bar chart with a Chart.js pie/doughnut chart. User wants full breakdown. |
| **Calendar + minutes integration** | When a meeting event is created, auto-create a linked minutes entry. Add a "Google Meet link" field to meeting events. |
| **Website editor** | Replace awards-admin card with a broader "Edit Website" section: gallery manager (upload/remove photos via GitHub API), Drive resource links (paste Drive URL + label → shows as card). |
| **Google Drive resources** | Simple manager: store `{ label, url, category }` entries in Blobs and display as clickable cards. No API needed — just paste share links. |
| **Strike history UI** | Each officer's strike entries have full history (task name, date) but no UI to view it. Could be a click-to-expand row in the roster. |
| **Instagram feed** | Mentioned as a future want. Needs Instagram Basic Display API (requires app approval) or a third-party embed. |
| **Gallery manager** | Officers can't add gallery photos from the dashboard. GitHub API approach (like link generator) or switch gallery to Blobs. |
