import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function rpc(id: unknown, result: unknown, nonce?: string) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: {
      ...cors,
      "content-type": "application/json",
      ...(nonce ? { "DPoP-Nonce": nonce } : {}),
    },
  });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

function textResult(id: unknown, text: string, isError = false, nonce?: string) {
  return rpc(id, { content: [{ type: "text", text }], isError }, nonce);
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
        const { verifyProof, mintNonce, effectiveMode, DpopError } = await import("@/lib/dpop.server");
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

        const origin = new URL(request.url).origin;
        const resourceMetadata = `${origin}/.well-known/oauth-protected-resource/api/public/mcp/${params.serverId}`;
        const token = request.headers.get("authorization")?.replace(/^(Bearer|DPoP)\s+/i, "") ?? null;

        const { data: brokerPolicy } = await supabaseAdmin
          .from("servers")
          .select("dpop_mode")
          .eq("id", params.serverId)
          .maybeSingle();
        const mode = effectiveMode(String(brokerPolicy?.dpop_mode ?? "preferred"), null);
        const proofHeader = request.headers.get("dpop");

        // Every proof is single-use: bound to this method, URL, token and nonce.
        let proofJkt: string | null = null;
        if (proofHeader && mode !== "disabled") {
          try {
            ({ jkt: proofJkt } = await verifyProof({
              proof: proofHeader,
              method: "POST",
              url: request.url,
              accessToken: token,
              requireNonce: true,
            }));
          } catch (e) {
            const err = e as InstanceType<typeof DpopError>;
            return new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                id,
                error: { code: -32001, message: `DPoP rejected: ${err.message}` },
              }),
              {
                status: 401,
                headers: {
                  ...cors,
                  "content-type": "application/json",
                  "DPoP-Nonce": await mintNonce(),
                  "WWW-Authenticate": `DPoP error="${err.code}", error_description="${err.message}"`,
                },
              },
            );
          }
        }

        if (mode === "required" && !proofJkt) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32001,
                message:
                  "This broker only accepts sender-constrained requests. Sign each call with a DPoP proof carrying the supplied nonce.",
              },
            }),
            {
              status: 401,
              headers: {
                ...cors,
                "content-type": "application/json",
                "DPoP-Nonce": await mintNonce(),
                "WWW-Authenticate": `DPoP realm="aegis", resource_metadata="${resourceMetadata}"`,
              },
            },
          );
        }

        const session = await authorizeBearer(params.serverId, token, proofJkt);
        if (!session) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32001,
                message:
                  "Unauthorized: no valid OAuth grant. Start the authorization flow at " +
                  `${origin}/api/public/oauth/authorize`,
              },
            }),
            {
              status: 401,
              headers: {
                ...cors,
                "content-type": "application/json",
                "WWW-Authenticate": `Bearer realm="aegis", resource_metadata="${resourceMetadata}"`,
              },
            },
          );
        }

        const { data: server } = await supabaseAdmin
          .from("servers")
          .select("*")
          .eq("id", params.serverId)
          .maybeSingle();
        if (!server) return rpcError(id, -32002, "Server not found", 404);
        if (!server.enabled) return rpcError(id, -32003, "This server is disabled", 403);

        // Hand out the next nonce so the client's following proof is already valid.
        const nextNonce = proofJkt ? await mintNonce() : undefined;

        if (method === "ping") return rpc(id, {}, nextNonce);

        const legacyNotice =
          session.kind === "legacy"
            ? " WARNING: this session uses an unscoped legacy bearer token with full access to every enabled tool. Ask the operator to switch this client to OAuth 2.1 for per-tool, expiring grants."
            : "";

        if (session.kind === "legacy" && method === "initialize") {
          await logEvent({
            user_id: session.userId,
            server_id: session.serverId,
            level: "warn",
            event: "auth.legacy_bearer_used",
            message: "Legacy unscoped bearer token used — no per-tool scoping applied",
          });
        }

        if (method === "initialize") {
          return rpc(id, {
            protocolVersion: "2025-06-18",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: server.slug, title: server.name, version: "1.0.0" },
            instructions: (server.instructions || server.description) + legacyNotice,
          }, nextNonce);
        }

        const { data: allTools } = await supabaseAdmin
          .from("tools")
          .select("*")
          .eq("server_id", server.id)
          .eq("enabled", true)
          .order("name");

        // A grant can only ever see the tools its scopes cover.
        const tools = (allTools ?? []).filter((t) => sessionAllows(session, t.name as string));

        if (method === "tools/list") {
          return rpc(id, { tools: tools.map((t) => toolToMcpSchema(t as never)) }, nextNonce);
        }

        if (method === "tools/call") {
          const name = String(payload.params?.name ?? "");
          const args = (payload.params?.arguments ?? {}) as Record<string, unknown>;
          const tool = tools.find((t) => t.name === name);
          if (!tool) {
            const known = (allTools ?? []).some((t) => t.name === name);
            if (known) {
              await logEvent({
                user_id: session.userId,
                server_id: session.serverId,
                level: "warn",
                event: "oauth.scope_denied",
                tool_name: name,
                message: `${session.clientName} called ${name} without the tool:${name} scope`,
              });
              return textResult(
                id,
                `Out of scope: this grant does not include "${name}". Ask the operator to authorize it — the current grant expires ${session.expiresAt}.`,
                true,
                nextNonce,
              );
            }
            return textResult(id, `Tool "${name}" is not enabled on this server.`, true, nextNonce);
          }

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
                nextNonce,
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
            return textResult(id, out.body || `(empty ${out.status} response)`, out.status >= 400, nextNonce);
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
            return textResult(id, message, true, nextNonce);
          }
        }

        return rpcError(id, -32601, `Method not found: ${method}`);
      },
    },
  },
});
