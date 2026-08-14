import { accessConfig, audienceFor } from "./config.server";
import { AccessError, verifyAccessToken } from "./jwks.server";
import type { AccessSurface, AccessVerdict } from "./types";

/**
 * The single entry point for the edge trust gate. Every surface that can be
 * reached from the public internet — console server functions and the MCP
 * proxy alike — asks this boundary the same question, so the policy lives in
 * exactly one place and cannot drift between them.
 */

const HEADER = "cf-access-jwt-assertion";
const COOKIE = "CF_Authorization";

function assertion(request: Request | undefined): string | null {
  if (!request) return null;
  const header = request.headers.get(HEADER);
  if (header) return header;
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function verifyAccess(
  request: Request | undefined,
  surface: AccessSurface,
): Promise<AccessVerdict> {
  const config = accessConfig();
  const configured = !!config.teamDomain && config.mode !== "off";
  const base = { configured, mode: config.mode, surface } as const;

  if (!configured) {
    return { ...base, allowed: true, identity: null, reason: "Access gate is not configured" };
  }

  const token = assertion(request);
  if (!token) {
    return { ...base, allowed: false, identity: null, reason: "No Access assertion on the request" };
  }

  try {
    const identity = await verifyAccessToken({
      token,
      teamDomain: config.teamDomain!,
      audiences: audienceFor(config, surface),
    });
    return { ...base, allowed: true, identity, reason: null };
  } catch (e) {
    const reason = e instanceof AccessError ? e.message : "Access verification failed";
    return { ...base, allowed: false, identity: null, reason };
  }
}

/**
 * Enforce the gate. In `monitor` the failure is recorded and the request
 * continues, so an operator can roll the tunnel out without locking themselves
 * out of their own broker.
 */
export async function guardAccess(
  request: Request | undefined,
  surface: AccessSurface,
): Promise<AccessVerdict> {
  const verdict = await verifyAccess(request, surface);
  if (!verdict.allowed && verdict.mode === "enforce") {
    throw new Error(`Forbidden: Cloudflare Access rejected this request — ${verdict.reason}`);
  }
  return verdict;
}

export function accessStatus() {
  const config = accessConfig();
  return {
    mode: config.mode,
    teamDomain: config.teamDomain,
    consoleAudiences: config.audiences.console.length,
    proxyAudiences: audienceFor(config, "proxy").length,
    configured: !!config.teamDomain && config.mode !== "off",
  };
}

export type { AccessVerdict, AccessSurface } from "./types";
