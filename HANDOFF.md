# FBLA Admin Dashboard — Handoff Doc

**Last updated:** May 2026 (full overhaul)  
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
| `netlify/functions/sheets-tasks.js` | Reads all tabs from task Google Sheet with cell background color → status mapping (green=done, red=missed). Returns tasks with department tab field. |
| `netlify/functions/sheets-budget.js` | Reads all budget tabs, auto-detects Revenue/Expenses/Total section structure, returns itemized per-tab data. |
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
| `src/pages/admin/calendar.astro` | `/admin/calendar` | Monthly calendar grid, color-coded by event type, add/edit/delete. Officer meeting events show a **Google Meet link** field and auto-link to their minutes doc. Clicking an officer meeting opens a slide-out panel with the meet link + embedded/linked minutes. |
| `src/pages/admin/tasks.astro` | `/admin/tasks` | **Spreadsheet-style task table** (default) + kanban board toggle. Columns: Date · Deadline · Task · Description · Lead Officer · Other Officers · Location. Color-coded rows: green=done, yellow=in progress, red=missed, white=not started. Strike auto-prompt when marked Missed. |
| `src/pages/admin/roster.astro` | `/admin/roster` | All FBLA members for the year. Fields: name, role, email, grade, notes. **Strikes column** shows SVG tally marks (groups of 5 with diagonal). Loads strike data in parallel — matches by full name then first name. |
| `src/pages/admin/budget.astro` | `/admin/budget` | Full budget dashboard — see Budget section below. |
| `src/pages/admin/edit-website.astro` | `/admin/edit-website` | Edit public site content. Gallery manager (upload/remove photos via GitHub API). Drive resource links. Page content fields for any static copy that changes year to year. |

**Removed:** `minutes.astro` — meeting minutes are now accessed directly through calendar events, not a standalone page.

---

## Data layer

All dashboard data is stored in **Netlify Blobs**, store name `fbla-dashboard`.

**API:** `/.netlify/functions/dashboard?resource=<name>`  
All resources support GET · POST · PUT (by id) · DELETE (by id).

| Resource | Fields stored |
|---|---|
| `events` | title, date, endDate, type, description, location, color, meetLink, minutesId |
| `tasks` | title, description, leadOfficer, otherOfficers[], deadline, dateAdded, status, location |
| `strikes` | officerName, count, history[] |
| `minutes` | title, date, content *(officer-meeting-linked only — no standalone page)* |
| `roster` | firstName, lastName, role, grade, email, notes |
| `website-resources` | label, url, category, description *(Drive links, image folders, etc.)* |
| `slc-trips` | year, destination, flightDetails, hotelDetails, attendees[], totalCost, notes, driveLink |
| `budget-entries` | date, category, description, amount, type (income\|expense), receiptUrl |

Awards GET is public (no auth). All other operations require `Authorization: Bearer <password>`.

**Removed resource:** `awards` — the public awards page and awards-admin page are being replaced by the Edit Website section, which handles all public-facing content management.

### Local dev fallback
`dashboard.js` detects when Blobs isn't configured and falls back to local JSON files in `.netlify/blobs-local/fbla-dashboard/` (one file per resource). This folder is gitignored via `.netlify`. No `netlify link` needed for local dev.

---

## Calendar + Minutes integration

Meeting minutes only exist for officer meetings — there is no standalone minutes page. The flow:

1. When an officer creates a calendar event with type `Officer Meeting`, two extra fields appear: **Google Meet link** and an optional **minutes content field**.
2. That minutes content is saved as a `minutes` resource entry, with its `id` stored in `event.minutesId`.
3. When any officer clicks an Officer Meeting on the calendar, a slide-out panel opens showing:
   - Join Google Meet button (links to `event.meetLink`)
   - Meeting minutes inline (editable by officers)
4. No separate `/admin/minutes` route exists. Minutes are only reachable through the calendar.

---

## Budget

The budget page needs to be a comprehensive financial hub. Current state: Chart.js bar chart with mock data.

**Target state:**
- **Live data** from Google Sheets via `sheets-budget.js` function
- **Income vs Expense overview** — bar chart (monthly) + doughnut chart (category breakdown)
- **Transaction table** — filterable/sortable by date, category, type
- **SLC trip tracker** — one card per year (flight details, hotel, attendees, total cost, Drive link to receipts/photos)
- **Drive resource links** — quick links to shared folders (budget spreadsheet, receipt photos, etc.)
- **Export** — download filtered data as CSV

**Google Sheets connection (recommended for live budget data):**
1. Add `GOOGLE_SHEETS_API_KEY`, `BUDGET_SHEET_ID`, and `BUDGET_SHEET_RANGE` to Netlify env vars
2. The `sheets-budget.js` function fetches from `https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}?key={key}`
3. No OAuth needed if the sheet is set to "Anyone with the link can view"

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

## Edit Website (replaces Awards Admin)

The `/admin/edit-website` page lets officers manage public-facing content on irvingtonfbla.org without touching code.

**Features to build:**
- **Gallery manager** — upload new photos (GitHub API commit to `src/assets/gallery/`), delete existing ones, reorder. Mirrors how `links.js` commits to GitHub.
- **Page content editor** — editable text fields for any copy that changes year to year (e.g. about page officer names, homepage tagline). Stored in Blobs → Astro fetches at build time or via client hydration.
- **Drive resource cards** — paste a Google Drive share URL + label + category → shows as a clickable card. Stored in `website-resources` Blobs resource.
- **Image folder links** — quick links to Drive folders for gallery uploads if using Drive instead of GitHub.

---

## Data transfer — importing existing data

Two approaches. Recommend doing **both**: API for live-synced data (tasks, budget), manual import for one-time historical data.

### Option A — Google Sheets API (recommended for tasks + budget)

If the master task calendar and budget both live in Google Sheets:

1. Make the sheet "Anyone with the link can view" (or use a service account)
2. Get a Google Sheets API key from Google Cloud Console (enable Sheets API, create an API key, restrict to Sheets API)
3. Add to Netlify env vars: `GOOGLE_SHEETS_API_KEY`, `TASK_SHEET_ID`, `BUDGET_SHEET_ID`
4. Build `netlify/functions/sheets-tasks.js` to fetch + transform rows into task objects, and `sheets-budget.js` for budget
5. The dashboard pages already try to fetch from functions and fall back to Blobs data — same pattern

**You don't need to do anything** — just share the Sheet IDs and column layout and this can be built.

### Option B — Manual CSV import (one-time historical data)

For data that doesn't need to stay live-synced (past SLC trips, old minutes, archived tasks):

1. Export each sheet as CSV (File → Download → CSV)
2. Share the CSV files here
3. A small import script converts them to the Blobs JSON format and POSTs them to the dashboard API
4. Done — data lives in Netlify Blobs from then on

### What to import

| Data | Approach | What to share |
|---|---|---|
| Master task calendar (current year) | Option A (live sync) | Sheet ID + column names |
| Budget (current year) | Option A (live sync) | Sheet ID + column names |
| Roster / member list | Option B or manual entry | CSV export |
| Past SLC trip details | Option B | Any notes/spreadsheet you have |
| Past meeting minutes | Option B (if wanted) | Docs or notes |

---

## Deploying

Push to `main` → Netlify auto-builds and deploys.

**Required env vars in Netlify dashboard:**
- `ADMIN_PASSWORD` — officer login password
- `GITHUB_TOKEN` — GitHub PAT with repo write access (for link generator + gallery manager)

Optional (for live data sync):
- `GOOGLE_SHEETS_API_KEY`
- `TASK_SHEET_ID` + `TASK_SHEET_RANGE`
- `BUDGET_SHEET_ID` + `BUDGET_SHEET_RANGE`

Netlify Blobs auto-creates its store on first write — no setup needed.

---

## What still needs to be built

| Feature | Priority | Notes |
|---|---|---|
| **Gallery manager** | High | `/admin/edit-website` has placeholder. Build GitHub API commit flow (like links.js) to upload/delete photos from `src/assets/gallery/`. |
| **Strike history UI** | Medium | Click-to-expand row in roster showing each strike entry (task name, date). Data already stored in `history[]`. |
| **Instagram feed** | Low | Needs Instagram Basic Display API (requires app approval) or a third-party embed. |
| **Calendar recurrence** | Low | Recurring LOOP sessions. Would need a repeat field + expansion logic in renderCalendar. |
