import { healthCheckLogic } from "./console.server";
import { logEvent } from "./proxy.server";

/**
 * Unattended upkeep: probe every enabled broker and warn ahead of anything that
 * is about to expire. Invoked only by the signed cron route.
 */

const SOON_MS = 24 * 3600_000;

export async function sweepFleet() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const soon = new Date(Date.now() + SOON_MS).toISOString();
  const now = new Date().toISOString();

  const { data: servers } = await supabaseAdmin
    .from("servers")
    .select("id, user_id, name")
    .eq("enabled", true);

  const checked = await Promise.all(
    (servers ?? []).map(async (s) => {
      try {
        const result = await healthCheckLogic(supabaseAdmin as never, s.user_id as string, s.id as string);
        return { server: s.name as string, health: result.health };
      } catch (e) {
        return { server: s.name as string, health: "down", error: (e as Error).message };
      }
    }),
  );

  const { data: credentials } = await supabaseAdmin
    .from("credentials")
    .select("id, user_id, server_id, label, expires_at")
    .not("expires_at", "is", null)
    .gt("expires_at", now)
    .lt("expires_at", soon);

  for (const c of credentials ?? []) {
    await logEvent({
      user_id: c.user_id as string,
      server_id: c.server_id as string,
      level: "warn",
      event: "credential.expiring",
      message: `Credential "${c.label}" expires ${c.expires_at} — rotate it before upstream calls start failing`,
    });
  }

  const { data: grants } = await supabaseAdmin
    .from("oauth_grants")
    .select("id, user_id, server_id, client_name, grant_expires_at")
    .is("revoked_at", null)
    .gt("grant_expires_at", now)
    .lt("grant_expires_at", soon);

  for (const g of grants ?? []) {
    await logEvent({
      user_id: g.user_id as string,
      server_id: g.server_id as string,
      level: "info",
      event: "oauth.grant_expiring",
      message: `Grant for ${g.client_name} expires ${g.grant_expires_at} — the client will need re-authorization`,
    });
  }

  return {
    checked,
    expiringCredentials: credentials?.length ?? 0,
    expiringGrants: grants?.length ?? 0,
  };
}
