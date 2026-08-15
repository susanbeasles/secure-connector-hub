import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui-bits";
import { createIngestSource, setIngestSourceState, telemetrySources } from "@/lib/telemetry.functions";

const ENDPOINT = "/api/public/telemetry/v1/events";

export function SourcesPanel() {
  const queryClient = useQueryClient();
  const fetchSources = useServerFn(telemetrySources);
  const addSource = useServerFn(createIngestSource);
  const toggleSource = useServerFn(setIngestSourceState);

  const [name, setName] = useState("");
  const [redact, setRedact] = useState("");
  const [issued, setIssued] = useState<string | null>(null);

  const sources = useQuery({ queryKey: ["telemetry", "sources"], queryFn: () => fetchSources({}) });

  const create = useMutation({
    mutationFn: () =>
      addSource({
        data: {
          name,
          serverId: null,
          redactKeys: redact.split(",").map((k) => k.trim()).filter(Boolean),
        },
      }),
    onSuccess: (result) => {
      setIssued(result.key);
      setName("");
      setRedact("");
      void queryClient.invalidateQueries({ queryKey: ["telemetry", "sources"] });
      toast.success("Ingest key issued — copy it now, it is never shown again.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const flip = useMutation({
    mutationFn: (input: { sourceId: string; disabled: boolean }) => toggleSource({ data: input }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["telemetry", "sources"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel space-y-4 p-4">
        <div>
          <p className="label-caps">New source</p>
          <p className="mt-1 text-sm text-muted-foreground">
            One key per agent, plugin, or hook. Keys are hashed at rest and shown once.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="source-name">Name</Label>
          <Input id="source-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="local code agent" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source-redact">Redact (comma separated)</Label>
          <Input
            id="source-redact"
            value={redact}
            onChange={(e) => setRedact(e.target.value)}
            placeholder="sk-, ghp_, internal.example.com"
          />
        </div>
        <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
          <KeyRound className="size-4" /> Issue ingest key
        </Button>

        {issued ? (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-medium">Copy this key now</p>
            <code className="mt-1 block break-all font-mono text-xs">{issued}</code>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                void navigator.clipboard.writeText(issued);
                toast.success("Copied");
              }}
            >
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
        ) : null}

        <div className="rounded-md bg-secondary p-3">
          <p className="label-caps">Endpoint</p>
          <code className="mt-1 block break-all font-mono text-xs">POST {origin}{ENDPOINT}</code>
          <p className="mt-2 text-xs text-muted-foreground">
            Bearer your ingest key. JSON object, JSON array, or NDJSON — all accepted.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {(sources.data ?? []).length === 0 ? (
          <Empty title="No sources" body="Issue a key to start capturing telemetry." />
        ) : (
          (sources.data ?? []).map((source) => (
            <div key={source.id} className="panel flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{source.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {source.key_prefix}… ·{" "}
                  {source.last_seen_at ? `last seen ${new Date(source.last_seen_at).toLocaleString()}` : "never used"}
                </p>
              </div>
              {source.disabled ? <Badge variant="destructive">disabled</Badge> : <Badge variant="outline">live</Badge>}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => flip.mutate({ sourceId: source.id, disabled: !source.disabled })}
              >
                {source.disabled ? "Enable" : "Disable"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
