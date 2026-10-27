import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const UPSTREAM = path.join(ROOT, ".openlist-upstream");
const OUT = path.join(ROOT, "dist");
const PIN = process.env.OPENLIST_REF || "29b7a8eb687aa5daf6cd2158fa27d83232ebae6f";

function run(cmd, args, cwd = ROOT) {
  console.log("[openlist-build]", cmd, args.join(" "));
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: process.env });
}

fs.rmSync(UPSTREAM, { recursive: true, force: true });
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(UPSTREAM, { recursive: true });
run("git", ["init", "-q"], UPSTREAM);
run("git", ["remote", "add", "origin", "https://github.com/OpenListTeam/OpenList-Worker.git"], UPSTREAM);
run("git", ["fetch", "--depth=1", "origin", PIN], UPSTREAM);
run("git", ["checkout", "-q", "FETCH_HEAD"], UPSTREAM);
run("npx", ["-y", "pnpm@9.15.4", "install", "--frozen-lockfile"], UPSTREAM);
run("node", ["scripts/fetch-frontend.mjs"], UPSTREAM);

const frontend = path.join(UPSTREAM, "dist");
const indexFile = path.join(frontend, "index.html");
let html = fs.readFileSync(indexFile, "utf8");
for (const [field, value] of [
  ["cdn", "/openlist"],
  ["base_path", "/openlist"],
  ["api", "/openlist"],
]) {
  const re = new RegExp("(" + field + "\\s*:\\s*)undefined\\b");
  if (!re.test(html)) throw new Error("Incompatible OpenList frontend: missing " + field);
  html = html.replace(re, (_, before) => before + JSON.stringify(value));
}
html = html.replace(/href=(["'])\/manifest\.json\1/g, 'href="/openlist/manifest.json"');
fs.writeFileSync(indexFile, html);

const entry = `import app from "./src/backend/index";
export default {
  async fetch(request, env, ctx) {
    // Fail closed until both secrets are installed. Never expose a public setup wizard.
    if (!env.JWT_SECRET || !env.ADMIN_PASS) {
      return new Response("OpenList deployment is not initialized", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex"
        }
      });
    }
    const actual = new URL(request.url);
    const p = actual.pathname;
    if (p === "/openlist") {
      actual.pathname = "/openlist/";
      return Response.redirect(actual.toString(), 308);
    }
    if (!p.startsWith("/openlist/")) {
      return new Response("Not Found", {status: 404});
    }
    // Do not rewrite the browser URL; only present root-relative paths to Hono.
    const internal = new URL(actual);
    internal.pathname = p.slice("/openlist".length) || "/";
    const result = await app.fetch(new Request(internal.toString(), request), env, ctx);
    const location = result.headers.get("Location");
    if (location) {
      try {
        const redirect = new URL(location, internal);
        if (redirect.origin === internal.origin && !redirect.pathname.startsWith("/openlist/")) {
          redirect.pathname = "/openlist" + redirect.pathname;
          const headers = new Headers(result.headers);
          headers.set("Location", redirect.toString());
          return new Response(result.body, {status: result.status, statusText: result.statusText, headers});
        }
      } catch {}
    }
    return result;
  }
};`;
fs.writeFileSync(path.join(UPSTREAM, "pages-openlist-entry.ts"), entry);
const cfg = {
  name: "openlist-ptufdc-pages-build",
  main: "pages-openlist-entry.ts",
  compatibility_date: "2026-10-20",
  compatibility_flags: ["nodejs_compat"],
  assets: { directory: "./dist", binding: "ASSETS", run_worker_first: true }
};
fs.writeFileSync(path.join(UPSTREAM, "wrangler.pages.json"), JSON.stringify(cfg, null, 2));
run("npx", ["-y", "wrangler@4", "deploy", "--dry-run", "--config", "wrangler.pages.json", "--outdir", ".worker-out"], UPSTREAM);
const built = path.join(UPSTREAM, ".worker-out");
const js = fs.readdirSync(built).filter(x => x.endsWith(".js"));
if (js.length !== 1) throw new Error("Expected exactly one Worker JS module, got: " + js.join(", "));
fs.copyFileSync(path.join(built, js[0]), path.join(frontend, "_worker.js"));
fs.cpSync(frontend, OUT, { recursive: true });
console.log("[openlist-build] Published Pages advanced-mode Worker and static frontend", { workerBytes: fs.statSync(path.join(OUT, "_worker.js")).size, assets: fs.readdirSync(OUT).length });
