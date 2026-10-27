# OpenList at /openlist/

Independent Cloudflare Pages build inside the `cloudflare-openlist` branch. Official upstream OpenList-Worker commit pinned by `OPENLIST_REF` in `build.mjs`. The dist `_worker.js` uses the Cloudflare Workers runtime in Pages advanced mode and serves the unmodified backend behind `/openlist/`; the official frontend's `window.OPENLIST_CONFIG` is configured with `base_path`, `api`, and `cdn` set to `/openlist`.

Cloudflare Pages must be configured with Node.js compatibility, a D1 binding named `DB`, and secrets `JWT_SECRET` and `ADMIN_PASS`. Suggested settings: `DB_DRIVER=d1`, `DB_FORMAT=sql`, `DB_CIPHER=aes-256-gcm`. The root GitHub branch is unaffected.
