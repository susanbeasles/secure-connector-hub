import { decryptSecret, sha256Hex } from "./crypto.server";

export type ToolRow = {
  id: string;
  name: string;
  description: string;
  method: string;
  path: string;
  input_schema: Record<string, unknown>;
  header_template: Record<string, string>;
  body_template: Record<string, unknown> | null;
  scopes: string[];
  approval: "always_ask" | "always_allow";
  enabled: boolean;
};

export type ServerRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  base_url: string;
  description: string;
  instructions: string;
  enabled: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function logEvent(entry: {
  user_id: string;
  server_id?: string | null;
  level?: string;
  event: string;
  tool_name?: string | null;
  status_code?: number | null;
  duration_ms?: number | null;
  message?: string;
  meta?: Record<string, unknown>;
}) {
  const db = await admin();
  await db.from("audit_logs").insert({
    user_id: entry.user_id,
    server_id: entry.server_id ?? null,
    level: entry.level ?? "info",
    event: entry.event,
    tool_name: entry.tool_name ?? null,
    status_code: entry.status_code ?? null,
    duration_ms: entry.duration_ms ?? null,
    message: entry.message ?? "",
    meta: (entry.meta ?? {}) as never,
  });
}

/** Validate an opaque client token against a server. Returns null when invalid/expired/revoked. */
export async function authenticateToken(serverId: string, token: string | null) {
  if (!token) return null;
  const db = await admin();
  const hash = await sha256Hex(token);
  const { data } = await db
    .from("access_tokens")
    .select("id, user_id, server_id, expires_at, revoked_at")
    .eq("token_hash", hash)
    .eq("server_id", serverId)
    .maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  await db
    .from("access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return data;
}

function interpolate(template: string, args: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) => {
    const v = args[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Resolve outbound auth headers for a server from its stored (encrypted) credential. */
export async function credentialHeaders(serverId: string): Promise<Record<string, string>> {
  const db = await admin();
  const { data } = await db
    .from("credentials")
    .select("header_name, value_template, encrypted_value, expires_at")
    .eq("server_id", serverId)
    .order("rotated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return {};
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("Stored credential has expired — rotate it in the console.");
  }
  const secret = await decryptSecret(data.encrypted_value);
  return { [data.header_name]: interpolate(data.value_template, { secret }) };
}

/** Execute one tool against the upstream provider. Credentials never leave the server. */
export async function executeTool(
  server: ServerRow,
  tool: ToolRow,
  args: Record<string, unknown>,
): Promise<{ status: number; body: string; durationMs: number }> {
  const started = Date.now();
  const base = server.base_url.replace(/\/+$/, "");
  let path = interpolate(tool.path, args);
  const method = tool.method.toUpperCase();

  const used = new Set(
    Array.from(tool.path.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)).map((m) => m[1] as string),
  );
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) if (!used.has(k)) rest[k] = v;

  let body: string | undefined;
  if (method === "GET" || method === "DELETE") {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(rest)) qs.set(k, String(v));
    if (Array.from(qs.keys()).length) path += (path.includes("?") ? "&" : "?") + qs.toString();
  } else {
    body = JSON.stringify(tool.body_template ? { ...tool.body_template, ...rest } : rest);
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    ...(await credentialHeaders(server.id)),
  };
  for (const [k, v] of Object.entries(tool.header_template ?? {})) {
    headers[k] = interpolate(String(v), args);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${base}${path.startsWith("/") ? "" : "/"}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body }),
      redirect: "error",
      signal: controller.signal,
    });
    const text = await res.text();
    return { status: res.status, body: text.slice(0, 40_000), durationMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export function toolToMcpSchema(tool: ToolRow) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.input_schema ?? { type: "object", properties: {} },
    annotations: {
      readOnlyHint: tool.method.toUpperCase() === "GET",
      destructiveHint: ["DELETE", "PUT", "PATCH"].includes(tool.method.toUpperCase()),
    },
  };
}
