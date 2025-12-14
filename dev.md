# Production Cleanup Notes

- Remove or minimize inline scripts/styles if CSP tightening is required.
- Review `netlify.toml` CSP: drop `unsafe-eval` and reduce `unsafe-inline` if Netlify Identity is not used.
- Ensure no client-side secrets are present; use environment variables set in Netlify dashboard.
- Confirm `public/admin/config.yml` values; remove placeholder `uploadcare` `publicKey` if unused.
- Remove unused large assets from `public/images` and any local-only folders.
- Validate redirects do not expose admin routes beyond `/admin/index.html`.
- Verify all external resources are whitelisted in CSP and required.
