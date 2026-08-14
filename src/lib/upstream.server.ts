import { decryptSecret, encryptSecret } from "./crypto.server";
import { logEvent } from "./proxy.server";

/**
 * Provider-side (upstream) OAuth2. The broker holds the provider grant; the
 * access token is refreshed server-side and never leaves this boundary — an
 * MCP client only ever presents its own broker-issued, sender-constrained token.
 */

export type UpstreamConfig = {
  serverId: string;
  provider: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string | undefined;
  scopes: string[];
  audience?: string | undefined;
  headerName: string;
  valueTemplate: string;
};

export type UpstreamStatus = {
  configured: boolean;
  provider: string | null;
  clientId: string | null;
  authorizeUrl: string | null;
  tokenUrl: string | null;
  scopes: string[];
  connected: boolean;
  scope: string;
  expiresAt: string | null;
  rotatedAt: string | null;
  rotations: number;
  refreshable: boolean;
};

const HANDSHAKE_TTL_MS = 10 * 60_000;
const REFRESH_SKEW_MS = 60_000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function random(bytes = 32): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function callbackUrl(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Callback origin must be https");
  }
  return `${url.origin}/api/public/oauth/upstream-callback`;
}

export async function saveUpstream(userId: string, input: UpstreamConfig) {
  const db = await admin();
  const secret = input.clientSecret ? await encryptSecret(input.clientSecret) : undefined;
  const existing = await db
    .from("upstream_oauth")
    .select("id")
    .eq("server_id", input.serverId)
    .maybeSingle();

  const payload = {
    server_id: input.serverId,
    user_id: userId,
    provider: input.provider,
    authorize_url: input.authorizeUrl,
    token_url: input.tokenUrl,
    client_id: input.clientId,
    scopes: input.scopes,
    audience: input.audience ?? null,
    header_name: input.headerName,
    value_template: input.valueTemplate,
    updated_at: new Date().toISOString(),
    ...(secret ? { encrypted_client_secret: secret } : {}),
  };

  const { error } = existing.data
    ? await db.from("upstream_oauth").update(payload).eq("id", existing.data.id)
    : await db.from("upstream_oauth").insert(payload);
  if (error) throw new Error(error.message);

  await logEvent({
    user_id: userId,
    server_id: input.serverId,
    event: "upstream.configured",
    message: `Provider OAuth app saved for ${input.provider}`,
    meta: { scopes: input.scopes },
  });
  return { ok: true };
}

/** Starts the provider handshake; returns the URL the operator must visit. */
export async function beginUpstream(userId: string, serverId: string, origin: string) {
  const db = await admin();
  const { data: cfg } = await db
    .from("upstream_oauth")
    .select("*")
    .eq("server_id", serverId)
    .maybeSingle();
  if (!cfg) throw new Error("Configure the provider OAuth app first");

  const state = random();
  const verifier = random(48);
  const redirectUri = callbackUrl(origin);
  await db.from("upstream_sessions").insert({
    server_id: serverId,
    state,
    code_verifier: verifier,
    redirect_uri: redirectUri,
    expires_at: new Date(Date.now() + HANDSHAKE_TTL_MS).toISOString(),
  });

  const url = new URL(cfg.authorize_url);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.client_id);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await challenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  if (cfg.scopes?.length) url.searchParams.set("scope", cfg.scopes.join(" "));
  if (cfg.audience) url.searchParams.set("audience", cfg.audience);

  await logEvent({
    user_id: userId,
    server_id: serverId,
    event: "upstream.authorize_started",
    message: `Provider consent requested from ${url.host}`,
  });
  return { authorizeUrl: url.toString(), expiresInSec: HANDSHAKE_TTL_MS / 1000 };
}

async function storeTokens(
  serverId: string,
  token: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
  },
  previousRotations: number,
) {
  const db = await admin();
  const payload = {
    server_id: serverId,
    encrypted_access: await encryptSecret(token.access_token),
    encrypted_refresh: token.refresh_token ? await encryptSecret(token.refresh_token) : null,
    token_type: token.token_type ?? "Bearer",
    scope: token.scope ?? "",
    expires_at: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null,
    rotated_at: new Date().toISOString(),
    rotations: previousRotations,
  };
  const existing = await db
    .from("upstream_tokens")
    .select("id")
    .eq("server_id", serverId)
    .maybeSingle();
  const { error } = existing.data
    ? await db.from("upstream_tokens").update(payload).eq("id", existing.data.id)
    : await db.from("upstream_tokens").insert(payload);
  if (error) throw new Error(error.message);
}

async function postToken(cfg: any, body: URLSearchParams) {
  body.set("client_id", cfg.client_id);
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (cfg.encrypted_client_secret) {
    const secret = await decryptSecret(cfg.encrypted_client_secret);
    headers["authorization"] = `Basic ${btoa(`${cfg.client_id}:${secret}`)}`;
  }
  const res = await fetch(cfg.token_url, {
    method: "POST",
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Provider token endpoint returned ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
  };
}

/** Redeems the provider's authorization code. Handshake state is single-use. */
export async function completeUpstream(state: string, code: string) {
  const db = await admin();
  const { data: session } = await db
    .from("upstream_sessions")
    .select("*")
    .eq("state", state)
    .maybeSingle();
  if (!session) throw new Error("Unknown or already-used authorization state");
  await db.from("upstream_sessions").delete().eq("id", session.id);
  if (new Date(session.expires_at).getTime() < Date.now()) throw new Error("Handshake expired");

  const { data: cfg } = await db
    .from("upstream_oauth")
    .select("*")
    .eq("server_id", session.server_id)
    .maybeSingle();
  if (!cfg) throw new Error("Provider OAuth app is no longer configured");

  const token = await postToken(
    cfg,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: session.redirect_uri,
      code_verifier: session.code_verifier,
    }),
  );
  await storeTokens(session.server_id, token, 0);
  await logEvent({
    user_id: cfg.user_id,
    server_id: session.server_id,
    event: "upstream.connected",
    message: `Provider grant stored for ${cfg.provider}`,
    meta: { scope: token.scope ?? "", expires_in: token.expires_in ?? null },
  });
  return { serverId: session.server_id as string };
}

async function refreshUpstream(cfg: any, row: any): Promise<string> {
  if (!row.encrypted_refresh) throw new Error("Provider grant expired — reconnect the provider");
  const refresh = await decryptSecret(row.encrypted_refresh);
  const token = await postToken(
    cfg,
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  );
  await storeTokens(cfg.server_id, { refresh_token: refresh, ...token }, (row.rotations ?? 0) + 1);
  await logEvent({
    user_id: cfg.user_id,
    server_id: cfg.server_id,
    event: "upstream.refreshed",
    message: "Provider access token rotated server-side",
    meta: { rotations: (row.rotations ?? 0) + 1 },
  });
  return token.access_token;
}

/** Outbound auth headers from the provider grant, refreshed on the fly. Null when unused. */
export async function upstreamHeaders(serverId: string): Promise<Record<string, string> | null> {
  const db = await admin();
  const { data: cfg } = await db
    .from("upstream_oauth")
    .select("*")
    .eq("server_id", serverId)
    .maybeSingle();
  if (!cfg) return null;
  const { data: row } = await db
    .from("upstream_tokens")
    .select("*")
    .eq("server_id", serverId)
    .maybeSingle();
  if (!row) throw new Error("Provider is configured but not connected — authorize it in the console");

  const stale = row.expires_at
    ? new Date(row.expires_at).getTime() - REFRESH_SKEW_MS < Date.now()
    : false;
  const access = stale ? await refreshUpstream(cfg, row) : await decryptSecret(row.encrypted_access);
  return {
    [cfg.header_name]: cfg.value_template.replace(/\{\{\s*secret\s*\}\}/g, access),
  };
}

export async function upstreamStatus(serverId: string): Promise<UpstreamStatus> {
  const db = await admin();
  const [{ data: cfg }, { data: row }] = await Promise.all([
    db.from("upstream_oauth").select("*").eq("server_id", serverId).maybeSingle(),
    db.from("upstream_tokens").select("*").eq("server_id", serverId).maybeSingle(),
  ]);
  return {
    configured: !!cfg,
    provider: cfg?.provider ?? null,
    clientId: cfg?.client_id ?? null,
    authorizeUrl: cfg?.authorize_url ?? null,
    tokenUrl: cfg?.token_url ?? null,
    scopes: cfg?.scopes ?? [],
    connected: !!row,
    scope: row?.scope ?? "",
    expiresAt: row?.expires_at ?? null,
    rotatedAt: row?.rotated_at ?? null,
    rotations: row?.rotations ?? 0,
    refreshable: !!row?.encrypted_refresh,
  };
}

export async function disconnectUpstream(userId: string, serverId: string) {
  const db = await admin();
  await db.from("upstream_tokens").delete().eq("server_id", serverId);
  await db.from("upstream_sessions").delete().eq("server_id", serverId);
  await logEvent({
    user_id: userId,
    server_id: serverId,
    level: "warn",
    event: "upstream.disconnected",
    message: "Provider grant deleted — outbound calls will fail until reconnected",
  });
  return { ok: true };
}
