import { cloudflareProvider } from "./cloudflare.server";
import { inlineProvider } from "./inline.server";
import type { DeploySpec, Deployment, Provider, Target } from "./types";

/**
 * The single entrypoint for anything that runs a broker somewhere. Callers never
 * touch a provider directly, so adding a runtime is one map entry and nothing else.
 */

const PROVIDERS: Record<Target, Provider> = {
  inline: inlineProvider,
  cloudflare: cloudflareProvider,
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function toDeployment(row: Record<string, unknown>): Deployment {
  return {
    serverId: row["server_id"] as string,
    target: row["target"] as Target,
    status: row["status"] as Deployment["status"],
    version: (row["version"] as number) ?? 0,
    workerName: (row["worker_name"] as string) ?? null,
    routeUrl: (row["route_url"] as string) ?? null,
    specDigest: (row["spec_digest"] as string) ?? null,
    lastError: (row["last_error"] as string) ?? null,
    lastReconciledAt: (row["last_reconciled_at"] as string) ?? null,
  };
}

async function record(event: {
  userId: string;
  serverId: string;
  action: string;
  status: string;
  detail?: string;
}) {
  const admin = await db();
  await admin.from("deploy_events").insert({
    user_id: event.userId,
    server_id: event.serverId,
    action: event.action,
    status: event.status,
    detail: event.detail ?? "",
  });
}

async function loadSpec(serverId: string, origin: string): Promise<DeploySpec> {
  const admin = await db();
  const { data } = await admin
    .from("servers")
    .select("id, user_id, slug")
    .eq("id", serverId)
    .maybeSingle();
  if (!data) throw new Error("Broker not found");
  return {
    serverId: data.id as string,
    userId: data.user_id as string,
    slug: data.slug as string,
    origin,
  };
}

export const Deploy = {
  targets: () =>
    (Object.keys(PROVIDERS) as Target[]).map((target) => ({
      target,
      available: PROVIDERS[target].available(),
    })),

  async status(serverId: string): Promise<Deployment | null> {
    const admin = await db();
    const { data } = await admin
      .from("deployments")
      .select("*")
      .eq("server_id", serverId)
      .maybeSingle();
    return data ? toDeployment(data as Record<string, unknown>) : null;
  },

  async events(serverId: string, limit = 25) {
    const admin = await db();
    const { data } = await admin
      .from("deploy_events")
      .select("id, action, status, detail, created_at")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  async launch(serverId: string, target: Target, origin: string): Promise<Deployment> {
    const provider = PROVIDERS[target];
    if (!provider.available()) throw new Error(`Runtime "${target}" is not configured`);
    const spec = await loadSpec(serverId, origin);
    const admin = await db();
    const previous = await Deploy.status(serverId);

    try {
      if (previous && previous.target !== target) {
        await PROVIDERS[previous.target].teardown(spec);
      }
      const result = await provider.launch(spec);
      const { data } = await admin
        .from("deployments")
        .upsert(
          {
            user_id: spec.userId,
            server_id: serverId,
            target,
            status: "live",
            version: (previous?.version ?? 0) + 1,
            worker_name: result.workerName,
            route_url: result.routeUrl,
            spec_digest: result.specDigest,
            last_error: null,
            last_reconciled_at: new Date().toISOString(),
          },
          { onConflict: "server_id" },
        )
        .select("*")
        .maybeSingle();
      await admin.from("servers").update({ runtime_target: target }).eq("id", serverId);
      await record({ userId: spec.userId, serverId, action: "launch", status: "live", detail: target });
      return toDeployment(data as Record<string, unknown>);
    } catch (e) {
      const detail = (e as Error).message;
      await admin
        .from("deployments")
        .upsert(
          { user_id: spec.userId, server_id: serverId, target, status: "failed", last_error: detail },
          { onConflict: "server_id" },
        );
      await record({ userId: spec.userId, serverId, action: "launch", status: "failed", detail });
      throw e;
    }
  },

  async teardown(serverId: string, origin: string) {
    const current = await Deploy.status(serverId);
    if (!current) return { ok: true };
    const spec = await loadSpec(serverId, origin);
    await PROVIDERS[current.target].teardown(spec);
    const admin = await db();
    await admin
      .from("deployments")
      .update({ status: "removed", route_url: null, worker_name: null })
      .eq("server_id", serverId);
    await admin.from("servers").update({ runtime_target: "inline" }).eq("id", serverId);
    await record({ userId: spec.userId, serverId, action: "teardown", status: "removed" });
    return { ok: true };
  },

  /** Self-heal: bring reality back to the recorded desired state. */
  async reconcile(serverId: string, origin: string) {
    const current = await Deploy.status(serverId);
    if (!current || current.status === "removed") return { status: "removed" as const };
    const spec = await loadSpec(serverId, origin);
    const health = await PROVIDERS[current.target].probe(spec, current);
    const admin = await db();

    if (health === "live") {
      await admin
        .from("deployments")
        .update({ status: "live", last_reconciled_at: new Date().toISOString(), last_error: null })
        .eq("server_id", serverId);
      return { status: "live" as const };
    }

    await record({
      userId: spec.userId,
      serverId,
      action: "reconcile",
      status: health,
      detail: "drift detected — redeploying",
    });
    await Deploy.launch(serverId, current.target, origin);
    return { status: "repaired" as const };
  },
};

export type { Deployment, Target } from "./types";
