import { createFileRoute } from "@tanstack/react-router";
import { jsonHeaders } from "@/lib/oauth-metadata";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, "cache-control": "no-store" },
  });
}

async function params(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? "")]));
  }
  return Object.fromEntries(new URLSearchParams(await request.text()));
}

export const Route = createFileRoute("/api/public/oauth/token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: jsonHeaders }),
      POST: async ({ request }) => {
        const { exchangeCode, refreshGrant } = await import("@/lib/oauth.server");
        let p: Record<string, string>;
        try {
          p = await params(request);
        } catch {
          return json({ error: "invalid_request" }, 400);
        }
        const secret = p["client_secret"] ?? null;

        try {
          if (p["grant_type"] === "authorization_code") {
            if (!p["code"] || !p["code_verifier"] || !p["client_id"] || !p["redirect_uri"]) {
              return json({ error: "invalid_request" }, 400);
            }
            return json(
              await exchangeCode({
                code: p["code"],
                clientId: p["client_id"],
                clientSecret: secret,
                redirectUri: p["redirect_uri"],
                codeVerifier: p["code_verifier"],
              }),
            );
          }
          if (p["grant_type"] === "refresh_token") {
            if (!p["refresh_token"] || !p["client_id"]) return json({ error: "invalid_request" }, 400);
            return json(
              await refreshGrant({
                refreshToken: p["refresh_token"],
                clientId: p["client_id"],
                clientSecret: secret,
              }),
            );
          }
          return json({ error: "unsupported_grant_type" }, 400);
        } catch (e) {
          const message = (e as Error).message;
          const code = message === "invalid_client" ? "invalid_client" : "invalid_grant";
          return json({ error: code }, 400);
        }
      },
    },
  },
});
