# Aegis Broker — Work Plan

Zero-trust MCP / connector builder: control plane + live proxy.
Status legend: [x] done · [~] partial · [ ] not started

## Phase 0 — Foundation (done)
- [x] Lovable Cloud backend enabled
- [x] Schema: `servers`, `tools`, `credentials`, `access_tokens`, `approvals`, `audit_logs` (RLS + grants)
- [x] `VAULT_ENCRYPTION_KEY` secret, AES-GCM envelope encryption (`crypto.server.ts`)
- [x] Design system: "cool clinical light", IBM Plex Sans, OKLCH blue

## Phase 1 — Control plane (done)
- [x] Operator auth: email/password + Google + Entra ID (`/auth`)
- [x] Fleet dashboard: stats, health dots, live activity feed
- [x] Creation wizard: identity, upstream base URL, auth type
- [x] Tool sources: JSON manifest paste, remote MCP introspection, empty start
- [x] Server console: Tools / Credentials / Access / Approvals / Logs
- [x] Credential rotation + TTL, short-lived opaque client tokens
- [x] Health checks with audit logging

## Phase 2 — Live proxy (done)
- [x] `POST /api/public/mcp/:serverId` JSON-RPC: `initialize`, `ping`, `tools/list`, `tools/call`
- [x] Bearer token auth (hashed, expiring, revocable)
- [x] Least-privilege outbound: credentials injected server-side only, never returned
- [x] `always_ask` approval gate with pending queue + one-shot consumption
- [x] Full request audit (status, duration, tool, level)

## Phase 3 — Client integration (done)
- [x] One-click config snippets per client (Claude Desktop, Cursor/Codex, VS Code, generic remote)
- [x] Copy-ready cURL + connector setup instructions for ChatGPT/Claude web
- [x] One-time reveal UX hardening (masked by default, reveal/copy/dismiss, never re-fetchable)

## Phase 4 — Client authorization: OAuth 2.1 (done)
- [x] Broker acts as its own authorization server: discovery metadata, dynamic client registration, PKCE-S256 authorization code, refresh grant, revocation
- [x] Per-grant fine-grained scopes derived from the broker's enabled tools (`tool:<name>`)
- [x] Consent screen: pick exact tools, grant lifetime (15m–7d), optional max-call budget
- [x] Proxy enforces scopes on `tools/list` and `tools/call`; out-of-scope calls are denied and audited
- [x] Grant inventory + instant revoke in the broker console
- [x] Legacy bearer tokens demoted to an explicitly-labelled fallback — never silent (warn-level audit event + notice injected into the client session)

## Phase 5 — Ops hardening (next)
- [ ] Scheduled health checks (cron endpoint under `/api/public/`)
- [ ] Log filtering/search + root-cause view (group by tool, error rate, p95 latency)
- [ ] Rate limiting per grant
- [ ] Automatic credential + grant expiry warnings
- [ ] Cloudflare Access JWT verification in front of console + proxy; Zero Trust tunnel deployment notes
- [ ] Upstream (provider-side) OAuth2 authorization-code flow with refresh rotation

## Phase 6 — Catalogue
- [ ] Curated starter templates (GitHub, Linear, Notion, Slack) with scoped tool sets
- [ ] Import/export server definition as portable JSON
