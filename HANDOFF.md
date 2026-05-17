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
| `netlify/functions/sheets-tasks.js` | Reads all tabs from the master task Google Sheet. Uses `includeGridData=true` to read cell background colors → status mapping (green=done, red=missed, yellow=in-progress, white=not-started). Returns `{ tasks[], tabs[] }` with a `tab` field per task for department grouping. |
| `netlify/functions/sheets-budget.js` | Reads all budget tabs. Uses `UNFORMATTED_VALUE` rendering to get raw numbers. Auto-detects section structure by row labels (Total Revenue / Expenses / Total Expenses / Current Balance). Returns `{ [tabName]: { revenue[], expenses[], totalRevenue, totalExpenses, currentBalance } }`. |
| `netlify/functions/package.json` | `{ "type": "commonjs" }` — fixes ESM/CJS conflict in Netlify Functions. |

### Layout
| File | Purpose |
|---|---|
| `src/layouts/AdminLayout.astro` | Dark sidebar shell used by all admin pages. Checks `localStorage.fbla_admin_pw` on load — redirects to `/admin` if missing. All common styles use `<style is:global>` so they apply to dynamically generated HTML. |

### Admin pages (all behind password)
| File | URL | Purpose |
|---|---|---|
| `src/pages/admin/index.astro` | `/admin` | Login gate + tool card grid. **Auto-authenticates on localhost** (no password needed for local dev). |
| `src/pages/admin/dashboard.astro` | `/admin/dashboard` | Overview hub: stats, upcoming events, open tasks, strike leaderboard. |
| `src/pages/admin/calendar.astro` | `/admin/calendar` | Monthly calendar. Color-coded dots for events + sky-blue dots for CTE/Non-CTE meeting schedule tasks. Clicking a day shows events, meeting schedule tasks (with clickable Canva/URL links), and other task deadlines. "N due" badge on cells with regular deadlines. Upcoming sidebar shows next 14 days of meetings and deadlines. |
| `src/pages/admin/tasks.astro` | `/admin/tasks` | Spreadsheet-style inline table. Dept tabs at top. Columns: Status · Task + description · Officers · Deadline · Edit. Status dropdown updates instantly (optimistic) for all tasks. Sheet tasks save status overrides to Blobs (see below). Blob tasks get a pencil edit button on hover. Sort: Missed → In Progress → Not Started → Done. |
| `src/pages/admin/roster.astro` | `/admin/roster` | All FBLA members for the year. Fields: name, role, email, grade, notes. **Strikes column** shows SVG tally marks (groups of 5 with diagonal). Strike data loaded in parallel — matched by full name first, then first name alone. |
| `src/pages/admin/budget.astro` | `/admin/budget` | Full budget dashboard. Tab bar for multi-tab sheets. Stats row (total revenue, expenses, balance, line item count). Bar chart (estimated vs actual per expense item, red bars when over budget) + doughnut chart (expense breakdown). Searchable expense table with all sheet columns. Revenue table (hidden if empty). SLC trip tracker cards (CRUD via Blobs `slc-trips`). Export CSV. Live data from `sheets-budget.js`. |
| `src/pages/admin/edit-website.astro` | `/admin/edit-website` | Manage Drive resource links for the public site. CRUD for `website-resources` Blobs resource — paste a Google Drive URL + label + category and it shows as a clickable card grouped by category. Gallery manager is a placeholder (not yet wired to GitHub API). |

**Removed:** `minutes.astro` — minutes are accessed through calendar events only, not a standalone page.

---

## Data layer

All dashboard data is stored in **Netlify Blobs**, store name `fbla-dashboard`.

**API:** `/.netlify/functions/dashboard?resource=<name>`  
All resources support GET · POST · PUT (by id) · DELETE (by id). All operations require `Authorization: Bearer <password>`.

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

### Local dev fallback
`dashboard.js` detects when Blobs isn't configured and falls back to local JSON files in `.netlify/blobs-local/fbla-dashboard/` (one file per resource). This folder is gitignored via `.netlify`. No `netlify link` needed for local dev.

---

## Google Sheets integration

Both `sheets-tasks.js` and `sheets-budget.js` are fully built and deployed. They require three env vars (set in Netlify dashboard):

| Var | Value |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | API key from Google Cloud Console (Sheets API enabled) |
| `TASK_SHEET_ID` | ID from the master task calendar URL |
| `BUDGET_SHEET_ID` | ID from the budget spreadsheet URL |

Sheets must be set to **"Anyone with the link can view"** — no OAuth needed. `TASK_SHEET_RANGE` and `BUDGET_SHEET_RANGE` are not used; the functions auto-discover all tabs by fetching the spreadsheet metadata first.

### Task sheet column layout (A→H)
`A: Date Added · B: Deadline · C: Status (cell color) · D: Task · E: Description · F: Lead Officer · G: Other Officer(s) · H: Location`

### Budget sheet section structure
The function auto-detects sections by scanning the label column (col A):
- Rows before "Total Revenue" → revenue entries
- "Expenses" row → switches to expense entries
- "Total Revenue" / "Total Expenses" / "Current Balance" → captured as summary totals

Budget entry columns: `A: Section label · B: Date · C: Item · D: Price · E: Count · F: Estimated · G: Actual · H: Submitted By · I: MF/PA Form · J: MF/PA Notes · K: Person with Form`

---

## Task board — sheet task status overrides

Sheet tasks are read-only from the Sheets API (the site uses a read-only API key, no write-back OAuth). When an officer changes a sheet task's status on the website, a **status override** is saved to Blobs as a `tasks` entry with these fields:

```json
{ "overrideFor": "<sheetTaskId>", "title": "...", "status": "done", "source": "override" }
```

On load, `loadData()` fetches both sheet tasks and blob tasks, separates overrides from regular blob tasks, builds an `overrideMap`, and applies overrides to matching sheet tasks before rendering. The override wins over whatever cell color is in the sheet.

**Status updates are optimistic** — the row changes color instantly in memory, then the save happens in the background. If the save fails, the status reverts and shows an error toast.

---

## Calendar — task deadline and meeting integration

The calendar (`calendar.astro`) loads three data sources in parallel:
1. **Events** — from Blobs via `dashboard?resource=events`
2. **Blob tasks** — from Blobs via `dashboard?resource=tasks`
3. **Sheet tasks** — from `sheets-tasks.js`, with overrides applied

Tasks are split into two groups:
- **Meeting schedule tasks** (`tab === 'CTE Meeting Schedule'` or `'Non-CTE Meeting Schedule'`) — shown as sky-blue dots on calendar cells and as full event rows in the sidebar. Any URL in the description becomes a clickable button (Canva links get a purple Canva button).
- **All other tasks with deadlines** — shown as a small "N due" badge on the calendar cell. In the sidebar, they appear in an "Other Deadlines" section below events.

The **upcoming sidebar** (no day selected) shows meetings and non-done deadlines due within the next 14 days.

---

## Calendar + Minutes integration

Meeting minutes only exist for officer meetings — there is no standalone minutes page. The flow:

1. When creating a calendar event with type `Officer Meeting`, two extra fields appear: **Google Meet link** and an optional **Meeting Notes** textarea.
2. That notes content is saved as a `minutes` resource entry; its `id` is stored in `event.minutesId`.
3. Clicking any Officer Meeting event on the calendar opens a slide-out panel with:
   - Join Google Meet button (links to `event.meetLink`)
   - Meeting minutes inline (editable by officers)
4. No separate `/admin/minutes` route exists.

---

## Budget

Live data is pulled from Google Sheets via `sheets-budget.js`. The page falls back to mock data if the function fails.

**What's built:**
- Tab bar for multi-tab budget sheets
- Stats row: Total Revenue (actual), Total Expenses (actual + estimated), Current Balance, line item count
- Bar chart (Chart.js): estimated vs actual per expense item — bars turn red when actual exceeds estimated
- Doughnut chart (Chart.js): expense breakdown by item (actual amounts)
- Revenue table (hidden when empty)
- Expense table: searchable, shows all sheet columns (item, date, price, count, estimated, actual, submitted by, MF/PA form info) — over-budget rows highlighted red
- SLC trip tracker: card per year, CRUD modal, stored in Blobs as `slc-trips`
- Export to CSV (filtered data)

---

## CSS — important note on Astro scoping

All page-level `<style>` tags in admin pages **must use `<style is:global>`**. Astro scopes regular `<style>` blocks by adding a hash attribute to static HTML elements only — dynamically generated HTML (set via `innerHTML`) never gets that hash, so scoped styles silently don't apply. Since the task board, calendar, and other pages generate almost all their content via JavaScript, all their styles are global.

---

## Auth system

1. User goes to `/admin`
2. **On localhost:** auto-authenticates with `sigmafbla67`, skips network call entirely
3. **On production:** POSTs to `/.netlify/functions/dashboard?resource=events` with the entered password. Returns 200 → saves to `localStorage.fbla_admin_pw`. Returns 401 → shows "Wrong password".
4. Every admin page (`AdminLayout.astro`) checks localStorage on load — redirects to `/admin` if missing.

**Production password:** Netlify dashboard → Site settings → Environment variables → `ADMIN_PASSWORD`  
**Local dev password:** `.env` → `ADMIN_PASSWORD=sigmafbla67` (gitignored, never commit)

**Multi-user accounts:** Not implemented — one shared password for all officers. If per-officer logins are ever needed, use Google OAuth restricted to the school domain rather than managing multiple passwords.

---

## Running locally

```bash
npx netlify dev
```

- Astro dev server: **port 4322** (internal)
- Netlify Dev proxy (with functions): **port 4321** ← use this one
- Go to `http://localhost:4321/admin` — login is automatic on localhost
- Data is stored locally in `.netlify/blobs-local/` and persists between restarts
- Sheets functions will call the real Google Sheets API if env vars are set in `.env`

---

## Task board specifics

The task board pulls live data from `sheets-tasks.js` (Google Sheets) and merges it with tasks stored in Blobs. Displayed as a spreadsheet-style inline table grouped by department.

**Row sort order:** Missed → In Progress → Not Started → Done, then by deadline within each group.

**Data fields per task:**
- `title` — task name
- `description` — details, times, links (URLs are clickable on the calendar)
- `leadOfficer` — primary person responsible
- `otherOfficers` — array of strings
- `deadline` — `YYYY-MM-DD` (sheet tasks may use `M/D/YYYY` — normalized at render time)
- `dateAdded` — auto-set on creation
- `status` — `not-started` | `in-progress` | `done` | `missed`
- `location` — `""` | `In-person` | `Online`
- `tab` — department name (from Google Sheet tab, or `"General"` for Blobs tasks)
- `source` — `"sheets"` for Google Sheet tasks, `"override"` for status override entries
- `overrideFor` — (override entries only) the `id` of the sheet task being overridden

**Backward compat:** Old tasks that used `assignedTo[]` still render — first element shows as Lead Officer, rest as Other Officers.

**Strikes:** When a task is marked Missed, a prompt offers to add strikes to the lead officer and all other officers. Strike records store `officerName`, `count`, and a `history[]` array of `{ taskId, taskTitle, date }`.

---

## Roster + strikes

Roster members: `firstName`, `lastName`, `role`, `grade`, `email`, `notes`.

Roles: `President` · `Vice President` · `Secretary` · `Treasurer` · `Reporter` · `Parliamentarian` · `Historian` · `Officer` · `Member`

Officers (non-Member roles) sort to the top. Tally marks are SVG — groups of 5 shown with a diagonal slash through 4 vertical bars.

Strike matching: looks up `"${firstName} ${lastName}"` in the strikes map first, then falls back to `firstName` alone (for tasks created before the roster existed).

---

## Edit Website

`/admin/edit-website` lets officers manage Drive resource links for the public site. Add a Google Drive URL + label + category and it appears as a clickable card grouped by category (Gallery, Documents, Spreadsheets, Other). Stored in `website-resources` Blobs resource.

**Gallery manager** is a placeholder card — the GitHub API commit flow (like `links.js`) still needs to be wired up to actually upload/delete photos from `src/assets/gallery/`.

---

## Deploying

Push to `main` → Netlify auto-builds and deploys.

**Required env vars:**
- `ADMIN_PASSWORD` — officer login password
- `GITHUB_TOKEN` — GitHub PAT with repo write access (for link generator + gallery manager)

**Required for live Sheets data:**
- `GOOGLE_SHEETS_API_KEY`
- `TASK_SHEET_ID`
- `BUDGET_SHEET_ID`

Netlify Blobs auto-creates its store on first write — no setup needed.

---

## What still needs to be built

| Feature | Priority | Notes |
|---|---|---|
| **Gallery manager** | High | `/admin/edit-website` has a placeholder card. Wire up GitHub API commit flow (mirroring `links.js`) to upload images to `src/assets/gallery/` and delete them. |
| **Sunday officer meetings** | High | Add recurring Sunday 9PM officer meeting events to the calendar (Oct 2025 – Apr 2026, ~30 events). User has meeting minutes for all of them to paste in. |
| **Strike history UI** | Medium | Click-to-expand row in roster showing each strike entry (task name, date). Data is already stored in `history[]` on each strike record. |
| **Instagram feed** | Low | Needs Instagram Basic Display API (requires app review) or a third-party embed widget. |
| **Calendar recurrence** | Low | Recurring LOOP sessions. Would need a `repeat` field on events + expansion logic in `renderCalendar`. |
