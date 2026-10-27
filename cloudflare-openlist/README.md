# ptufdc.com/openlist — Cloudflare OpenList

Based on the official [OpenList-Worker](https://github.com/OpenListTeam/OpenList-Worker) repository. The upstream commit is pinned in `build.mjs`; this branch is isolated from the existing repository default branch.

## Status (2026-10-27)

- [x] GitHub Actions build and static output validation succeeded.
- [x] Cloudflare Pages project `openlist-ptufdc` created.
- [x] D1 database `openlist-ptufdc` bound as `DB`, with `DB_DRIVER=d1`, `DB_FORMAT=sql`, `DB_CIPHER=aes-256-gcm`.
- [x] Gateway Worker `openlist-ptufdc-path` uploaded but **no main-domain routes attached**.
- [ ] Add production secrets `JWT_SECRET` and `ADMIN_PASS` as encrypted values in Pages Settings → Variables and Secrets. Generate two DIFFERENT values locally (e.g. `openssl rand -hex 32` twice). Do not commit these secrets to GitHub.
- [ ] Enable production Git deployments on Pages and verify the build and `https://openlist-ptufdc.pages.dev/openlist/` initialization/login, API health, frontend assets, file listings and downloads.
- [ ] Attach the gateway to `ptufdc.com/openlist/*` and `www.ptufdc.com/openlist/*` (plus optional exact `/openlist` for slash redirect). Do not modify existing `/download/*` routes.
- [ ] Validate end-to-end web UI, login, WebDAV and S3 gateway. WebDAV `href` may need a follow-up rewrite to preserve `/openlist` prefixes.

**Security:** Until `ADMIN_PASS` and `JWT_SECRET` are configured, production deployment is intentionally **disabled**, preventing public takeover of an uninitialized installation. Never deploy without both.

## Build

The official frontend supports `window.OPENLIST_CONFIG.base_path` and `window.__dynamic_base__`. `build.mjs` patches these to `/openlist`, and bundles the upstream backend into Cloudflare Pages advanced-mode `dist/_worker.js`.

```sh
cd cloudflare-openlist
npm run build
```

This project uses Pages advanced mode for the Workers runtime. A separate Cloudflare Worker attached later to a zone Route will proxy only `/openlist/*` from the apex/www domain to the Pages origin. No new ptufdc.com DNS subdomain is required.

GitHub build: https://github.com/StarsbySea/onedrive-vercel-index/actions/workflows/openlist-build.yml
