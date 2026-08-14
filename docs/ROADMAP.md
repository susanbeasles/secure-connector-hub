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

## Phase 5 — Non-replayable tokens (done)

- DPoP (RFC 9449) proofs on every MCP call: single-use `jti`, broker-issued
  rolling `DPoP-Nonce`, method/URL/token binding, replay table.
- Grants sender-constrained to the client key thumbprint (`cnf.jkt`); a stolen
  token is inert without the private key.
- Refresh rotation with reuse detection — replay nukes the grant chain.
- Broker signing key in AWS KMS (HSM) when configured, WebCrypto otherwise;
  public half published at `/.well-known/jwks.json`.
- WebAuthn touch on the consent screen, policy per broker: never / writes /
  destructive / always, and physical-key-only, device-key, or any authenticator.

## Phase 6 — Ops hardening (in progress)
- [x] Scheduled health checks (`POST /api/public/cron/health`, `x-cron-secret`)
- [x] Log filtering/search + root-cause view (per-tool error rate, p50/p95 latency)
- [x] Rate limiting per grant (broker default configurable under Security)
- [x] Automatic credential + grant expiry warnings (fleet sweep)
- [x] Managed runtime targets (inline + Cloudflare Workers for Platforms), self-healing reconciliation
- [x] Permanent history: daily rollups, verbatim archive, configurable hot-log retention, CSV export
- [x] Zero-trust bootstrap: explicit ownership ceremony (`BOOTSTRAP_SECRET`), one-time recovery code, signing-key attestation chain
- [x] Cloudflare Access JWT verification in front of console + proxy (`src/lib/access/`): team JWKS with rotation-safe cache, per-surface audiences, `off`/`monitor`/`enforce` rollout, denied proxy calls audited as `access.denied`, status readout on the Operators page
  - Env: `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, optional `CF_ACCESS_PROXY_AUD`, `CF_ACCESS_MODE`
- [x] Upstream (provider-side) OAuth2 authorization-code flow with PKCE, sealed client secret, server-side refresh rotation, single-use handshake state (`/api/public/oauth/upstream-callback`, "Provider auth" tab)


## Phase 6 — Catalogue
- [ ] Curated starter templates (GitHub, Linear, Notion, Slack) with scoped tool sets
- [ ] Import/export server definition as portable JSON
