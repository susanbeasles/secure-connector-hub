import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { accessGate } from "@/lib/access.functions";

const TONE: Record<string, string> = {
  enforce: "Enforcing",
  monitor: "Monitoring",
  off: "Not configured",
};

/** Read-only: the edge gate is configured at deploy time, never from the console. */
export function AccessGateCard() {
  const fetchGate = useServerFn(accessGate);
  const { data } = useQuery({
    queryKey: ["access-gate"],
    staleTime: 60_000,
    queryFn: () => fetchGate({ data: undefined }),
  });
  if (!data) return null;

  return (
    <section className="panel mb-6 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cloud className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Cloudflare Access</h2>
        </div>
        <Badge variant={data.mode === "enforce" ? "default" : "secondary"}>
          {TONE[data.mode] ?? data.mode}
        </Badge>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        A second, independent gate in front of both the console and the MCP proxy. Assertions are
        verified against your team's signing keys on every request — an account that slipped past
        the identity provider still cannot reach the broker without passing the tunnel.
      </p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="label-caps">Team domain</dt>
          <dd className="mt-0.5 font-mono text-xs">{data.teamDomain ?? "CF_ACCESS_TEAM_DOMAIN"}</dd>
        </div>
        <div>
          <dt className="label-caps">Applications</dt>
          <dd className="mt-0.5">
            {data.consoleAudiences} console · {data.proxyAudiences} proxy
          </dd>
        </div>
        <div>
          <dt className="label-caps">This request</dt>
          <dd className="mt-0.5">
            {data.allowed ? (data.identityEmail ?? "Allowed") : (data.reason ?? "Rejected")}
          </dd>
        </div>
      </dl>
      {!data.configured ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Set <code className="font-mono">CF_ACCESS_TEAM_DOMAIN</code>,{" "}
          <code className="font-mono">CF_ACCESS_AUD</code> and optionally{" "}
          <code className="font-mono">CF_ACCESS_PROXY_AUD</code>, then{" "}
          <code className="font-mono">CF_ACCESS_MODE=monitor</code> to roll out safely before
          switching to <code className="font-mono">enforce</code>.
        </p>
      ) : null}
    </section>
  );
}
