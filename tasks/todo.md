# FBLA Website: Sync & Deployment Plan

## Goals
- Make local edits visible on `localhost` while matching the live site.
- Ensure deploys reliably update `irvingtonfbla.org` from this project.
- Keep the local source and the deployed version in lockstep.

## Current Setup (observed)
- Framework: Astro (`npm run dev`, `npm run build`).
- Build output: `dist/` (ignored in Git; deployed to Netlify).
- Netlify config: `netlify.toml` with `publish="dist"`, `command="npm run build"`, Node `18`.
- CMS: Decap/Netlify CMS (`public/admin/config.yml`) using `git-gateway` on branch `main`.
- Security headers enabled via `netlify.toml`.

## Recommended Workflow
- Local development: `npm run dev` for quick iteration; build parity checks via `npm run build` and a local static server.
- Deployment (pick one):
  - Git-based CI/CD (recommended): Connect GitHub repo to Netlify → every push to `main` triggers a build and deploy.
  - CLI manual deploy: `npx netlify deploy --prod --dir=dist` after a local build.
- CMS: If you want edits from `/admin` to commit back to Git, enable Netlify Identity + Git Gateway on the linked site.

## Tasks
- [ ] Confirm which Netlify site powers `irvingtonfbla.org` (site name/slug).
- [ ] Link this local project to that Netlify site (`netlify link` or through dashboard).
- [ ] Decide deployment method (Git CI/CD vs. CLI) and configure accordingly.
- [ ] Verify localhost matches live: build locally, compare `/dist` to current live pages.
- [ ] Reconcile any differences (content/pages/images) to make this repo the source of truth.
- [ ] If CMS will be used: enable Identity + Git Gateway, confirm `backend: git-gateway` works.
- [ ] Document the workflow in `README.md` and capture caveats in `dev.md`.
- [ ] Security and hygiene pass: `.env` not committed, no secrets in client, `dist/` excluded, large unused assets removed.

## How Code Changes Affect Live Site
- Local: Edit files → see changes at `http://localhost:4321` (`npm run dev`).
- Build parity: Run `npm run build` → open `dist/` locally to validate production output.
- Deploy:
  - Git CI/CD: `git push` to `main` → Netlify builds from source using `netlify.toml` → live site updates.
  - CLI: `npm run build` → `npx netlify deploy --prod --dir=dist` (requires Netlify auth + site link).

## Clarifications Needed
- Which Netlify account/site currently owns `irvingtonfbla.org`?
- Do you prefer Git-based auto-deploys or CLI/manual deploys?
- Should CMS be active on production (Identity/Git Gateway), or keep content static only?

## Review
- Verified Netlify build config (`netlify.toml:1-7`) uses `npm run build` and publishes `dist`.
- Built locally (`npm run build`) to confirm production output matches localhost.
- Confirmed hygiene: `.gitignore` excludes `dist/` and `.env` files (`.gitignore:2,17-18`).
- Security headers present in Netlify config (`netlify.toml:26-37`); keep `unsafe-inline/unsafe-eval` only if Netlify Identity is required.
- No secrets found committed; CMS uses `git-gateway` (`public/admin/config.yml:1-3`).

### Next
- Push to GitHub `main`; Netlify will auto-build and deploy using these settings.
- Tighten CSP if Identity is not used by removing `unsafe-eval`/reducing `unsafe-inline`.
