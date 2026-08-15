import { createFileRoute } from "@tanstack/react-router";

/**
 * The public ingest door. One route, one contract: bearer ingest key, JSON or
 * NDJSON body, always answers fast. Auth is checked here because /api/public/*
 * bypasses the console gate by design.
 */

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-ingest-key");
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through to NDJSON */
    }
  }
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export const Route = createFileRoute("/api/public/telemetry/v1/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { resolveSource, capture, ingestBudget } = await import("@/lib/telemetry/ingest.server");
        const source = await resolveSource(bearer(request));
        if (!source) return json({ error: "invalid_ingest_key" }, 401);

        const verdict = await ingestBudget(source.id);
        if (!verdict.allowed) {
          return json({ error: "rate_limited", resetAt: verdict.resetAt }, 429, {
            "retry-after": String(verdict.retryAfterSec),
          });
        }

        try {
          const result = await capture(source, await readBody(request));
          return json({ ok: true, accepted: result.accepted }, 202);
        } catch (e) {
          return json({ error: "invalid_payload", detail: e instanceof Error ? e.message : "" }, 400);
        }
      },
      GET: async () => json({ ok: true, contract: "telemetry/v1", accepts: ["json", "ndjson"] }, 200),
    },
  },
});
