/**
 * ptufdc.com/openlist/* -> isolated Cloudflare Pages (OpenList Worker runtime).
 * Deliberately not attached to a public route before protected OpenList completes initialization.
 */
const UPSTREAM = "https://openlist-ptufdc.pages.dev";
export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    if (incoming.pathname === "/openlist") {
      incoming.pathname = "/openlist/";
      return Response.redirect(incoming.toString(), 308);
    }
    if (!incoming.pathname.startsWith("/openlist/")) {
      return new Response("Not Found", { status: 404 });
    }

    const target = new URL(incoming.pathname + incoming.search, UPSTREAM);
    const headers = new Headers(request.headers);
    headers.delete("host");
    const upstreamRequest = new Request(target.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual"
    });
    const result = await fetch(upstreamRequest);
    const outgoingHeaders = new Headers(result.headers);
    const redirect = outgoingHeaders.get("location");
    if (redirect) {
      const absolute = new URL(redirect, target);
      if (absolute.origin === target.origin) {
        absolute.protocol = incoming.protocol;
        absolute.host = incoming.host;
        outgoingHeaders.set("location", absolute.toString());
      }
    }

    outgoingHeaders.set("x-content-type-options", "nosniff");
    if (/^\/openlist\/(api|dav|s3|d|p|sd)(\/|$)/.test(incoming.pathname)) {
      outgoingHeaders.set("cache-control", "private, no-store");
    }
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers: outgoingHeaders
    });
  }
};
