import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function rpc(id: unknown, result: unknown) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { ...cors, "content-type": "application/json" },
  });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

function textResult(id: unknown, text: string, isError = false) {
  return rpc(id, { content: [{ type: "text", text }], isError });
}

export const Route = createFileRoute("/api/public/mcp/$serverId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () =>
        new Response(
          JSON.stringify({
            transport: "streamable-http",
            note: "POST JSON-RPC with a short-lived bearer token issued from the console.",
          }),
          { headers: { ...cors, "content-type": "application/json" } },
        ),
      POST: async ({ request, params }) => {
        const { executeTool, logEvent, toolToMcpSchema } = await import("@/lib/proxy.server");
        const { authorizeBearer, sessionAllows } = await import("@/lib/oauth.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let payload: { id?: unknown; method?: string; params?: any };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return rpcError(null, -32700, "Parse error");
        }
        const id = payload.id ?? null;
        const method = payload.method ?? "";

        if (method.startsWith("notifications/")) return new Response(null, { status: 202, headers: cors });

        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
        const session = await authenticateToken(params.serverId, token);
        if (!session) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              error: { code: -32001, message: "Unauthorized: missing, expired or revoked token" },
            }),
            { status: 401, headers: { ...cors, "content-type": "application/json" } },
          );
        }

        const { data: server } = await supabaseAdmin
          .from("servers")
          .select("*")
          .eq("id", params.serverId)
          .maybeSingle();
        if (!server) return rpcError(id, -32002, "Server not found", 404);
        if (!server.enabled) return rpcError(id, -32003, "This server is disabled", 403);

        if (method === "ping") return rpc(id, {});

        if (method === "initialize") {
          return rpc(id, {
            protocolVersion: "2025-06-18",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: server.slug, title: server.name, version: "1.0.0" },
            instructions: server.instructions || server.description,
          });
        }

        const { data: tools } = await supabaseAdmin
          .from("tools")
          .select("*")
          .eq("server_id", server.id)
          .eq("enabled", true)
          .order("name");

        if (method === "tools/list") {
          return rpc(id, { tools: (tools ?? []).map((t) => toolToMcpSchema(t as never)) });
        }

        if (method === "tools/call") {
          const name = String(payload.params?.name ?? "");
          const args = (payload.params?.arguments ?? {}) as Record<string, unknown>;
          const tool = (tools ?? []).find((t) => t.name === name);
          if (!tool) return textResult(id, `Tool "${name}" is not enabled on this server.`, true);

          if (tool.approval === "always_ask") {
            const { data: approved } = await supabaseAdmin
              .from("approvals")
              .select("id")
              .eq("server_id", server.id)
              .eq("tool_name", name)
              .eq("status", "approved")
              .gt("expires_at", new Date().toISOString())
              .limit(1)
              .maybeSingle();

            if (!approved) {
              await supabaseAdmin.from("approvals").insert({
                user_id: server.user_id,
                server_id: server.id,
                tool_name: name,
                args: args as never,
                status: "pending",
              });
              await logEvent({
                user_id: server.user_id,
                server_id: server.id,
                level: "warn",
                event: "tool.approval_required",
                tool_name: name,
                message: `Call to ${name} is awaiting human approval`,
                meta: { args },
              });
              return textResult(
                id,
                `Approval required. A request to run "${name}" was sent to the operator console. Ask the user to approve it, then retry this call.`,
                true,
              );
            }
            await supabaseAdmin
              .from("approvals")
              .update({ status: "consumed", decided_at: new Date().toISOString() })
              .eq("id", approved.id);
          }

          try {
            const out = await executeTool(server as never, tool as never, args);
            await logEvent({
              user_id: server.user_id,
              server_id: server.id,
              level: out.status < 400 ? "info" : "error",
              event: "tool.call",
              tool_name: name,
              status_code: out.status,
              duration_ms: out.durationMs,
              message: `Proxied ${tool.method} ${tool.path}`,
            });
            return textResult(id, out.body || `(empty ${out.status} response)`, out.status >= 400);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Upstream call failed";
            await logEvent({
              user_id: server.user_id,
              server_id: server.id,
              level: "error",
              event: "tool.call_failed",
              tool_name: name,
              message,
            });
            return textResult(id, message, true);
          }
        }

        return rpcError(id, -32601, `Method not found: ${method}`);
      },
    },
  },
});
