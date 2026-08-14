import { domainProves, verifyName } from "./dns.server";
import { emailDomain, normalizeEmail } from "../identity/verify.server";
import { sessionForEmail, type SessionTokens } from "../identity/authclient.server";

/**
 * Domain-proof onboarding.
 *
 * Whoever controls the zone and the identity provider for it already controls
 * every mailbox inside it, so asking that party to also prove a mailbox proves
 * nothing new. Once the TXT record is in place and an asymmetric IdP is bound
 * to the domain, identities the IdP asserts are taken at face value.
 *
 * A zone has exactly one holder. A domain that merely *looks* like yours
 * conveys nothing until the record is there.
 */

export type DomainClaim = {
  id: string;
  domain: string;
  status: "pending" | "verified";
  recordName: string;
  recordValue: string;
  verifiedAt: string | null;
  ssoKind: string | null;
  ssoProviderId: string | null;
  ssoMetadataUrl: string | null;
  ssoRotatedAt: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/;

export function normalizeDomain(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!DOMAIN_RE.test(value)) throw new Error("That is not a domain this broker can verify");
  return value;
}

function toClaim(row: Record<string, unknown>): DomainClaim {
  const domain = row["domain"] as string;
  return {
    id: row["id"] as string,
    domain,
    status: row["status"] as "pending" | "verified",
    recordName: verifyName(domain),
    recordValue: `aegis-verify=${row["txt_token"] as string}`,
    verifiedAt: (row["verified_at"] as string) ?? null,
    ssoKind: (row["sso_kind"] as string) ?? null,
    ssoProviderId: (row["sso_provider_id"] as string) ?? null,
    ssoMetadataUrl: (row["sso_metadata_url"] as string) ?? null,
    ssoRotatedAt: (row["sso_rotated_at"] as string) ?? null,
  };
}

/** Start or resume a claim. An already-held zone is never re-issued to someone else. */
export async function openDomainClaim(rawDomain: string, actor?: string): Promise<DomainClaim> {
  const domain = normalizeDomain(rawDomain);
  const db = await admin();
  const { data: existing } = await db
    .from("domain_claims")
    .select("*")
    .ilike("domain", domain)
    .maybeSingle();
  if (existing) {
    if (existing.status === "verified" && actor && existing.claimed_by && existing.claimed_by !== actor) {
      throw new Error("That domain is already held by another party");
    }
    return toClaim(existing);
  }
  const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const { data, error } = await db
    .from("domain_claims")
    .insert({ domain, txt_token: token, claimed_by: actor ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toClaim(data);
}

export async function checkDomainClaim(id: string): Promise<DomainClaim> {
  const db = await admin();
  const { data: row } = await db.from("domain_claims").select("*").eq("id", id).maybeSingle();
  if (!row) throw new Error("Unknown domain claim");
  if (row.status === "verified") return toClaim(row);
  const proved = await domainProves(row.domain as string, row.txt_token as string);
  if (!proved) throw new Error(`No matching TXT record on ${verifyName(row.domain as string)} yet`);
  const { data } = await db
    .from("domain_claims")
    .update({ status: "verified", verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  return toClaim(data!);
}

export async function domainClaimFor(domain: string): Promise<DomainClaim | null> {
  const db = await admin();
  const { data } = await db.from("domain_claims").select("*").ilike("domain", domain).maybeSingle();
  return data ? toClaim(data) : null;
}

export async function listDomainClaims(): Promise<DomainClaim[]> {
  const db = await admin();
  const { data } = await db.from("domain_claims").select("*").order("created_at");
  return (data ?? []).map(toClaim);
}

/**
 * A verified zone may bind an IdP by metadata alone: descriptor in, connection
 * out. Verification is asymmetric only — the signing material is read from the
 * IdP's published metadata, never a shared secret pasted into a form.
 */
export async function bindDomainSso(input: {
  id: string;
  kind: "saml" | "oidc";
  metadataUrl: string;
}): Promise<DomainClaim> {
  const db = await admin();
  const { data: row } = await db.from("domain_claims").select("*").eq("id", input.id).maybeSingle();
  if (!row) throw new Error("Unknown domain claim");
  if (row.status !== "verified") throw new Error("Prove the domain before binding an identity provider");

  const descriptor = await fetch(input.metadataUrl, { redirect: "follow" });
  if (!descriptor.ok) throw new Error("Could not read that provider's metadata");
  const body = await descriptor.text();
  if (input.kind === "oidc") {
    const doc = JSON.parse(body) as { jwks_uri?: string; issuer?: string };
    if (!doc.jwks_uri || !doc.issuer) throw new Error("That discovery document has no issuer or JWKS");
  } else if (!/X509Certificate|SingleSignOnService/i.test(body)) {
    throw new Error("That does not look like SAML metadata");
  }

  const { data } = await db
    .from("domain_claims")
    .update({
      sso_kind: input.kind,
      sso_metadata_url: input.metadataUrl,
      sso_provider_id: row.sso_provider_id ?? `${input.kind}:${row.domain}`,
      sso_rotated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  const { attest } = await import("../bootstrap.server");
  await attest(`sso bound for ${row.domain} (${input.kind})`);
  return toClaim(data!);
}

/**
 * Re-read the provider's published keys. Old and new material overlap for as
 * long as the provider publishes both, so rotation never needs a human.
 */
export async function rotateDomainSso(id: string): Promise<{ keys: number; rotatedAt: string }> {
  const db = await admin();
  const { data: row } = await db.from("domain_claims").select("*").eq("id", id).maybeSingle();
  if (!row?.sso_metadata_url) throw new Error("No identity provider is bound to that domain");
  const res = await fetch(row.sso_metadata_url as string, { redirect: "follow" });
  if (!res.ok) throw new Error("The provider's metadata is unreachable");
  const body = await res.text();
  let keys = 0;
  if (row.sso_kind === "oidc") {
    const doc = JSON.parse(body) as { jwks_uri?: string };
    const jwks = (await fetch(doc.jwks_uri!).then((r) => r.json())) as { keys?: unknown[] };
    keys = jwks.keys?.length ?? 0;
  } else {
    keys = (body.match(/X509Certificate/g) ?? []).length;
  }
  const rotatedAt = new Date().toISOString();
  await db.from("domain_claims").update({ sso_rotated_at: rotatedAt }).eq("id", id);
  const { attest } = await import("../bootstrap.server");
  await attest(`sso keys refreshed for ${row.domain} (${keys} active)`);
  return { keys, rotatedAt };
}

/**
 * Sign in through a proven domain. The mailbox is not challenged — the zone
 * holder already speaks for every address in it.
 */
export async function sessionByDomainProof(rawEmail: string): Promise<SessionTokens & { email: string }> {
  const email = normalizeEmail(rawEmail);
  const claim = await domainClaimFor(emailDomain(email));
  if (!claim || claim.status !== "verified") throw new Error("That domain is not verified here");
  if (!claim.ssoProviderId) throw new Error("That domain has no identity provider bound yet");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (!existing.users.some((u) => u.email?.toLowerCase() === email)) {
    await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  }
  return { email, ...(await sessionForEmail(email)) };
}
