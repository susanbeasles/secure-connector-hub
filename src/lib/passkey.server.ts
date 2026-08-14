import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { fromB64url, rpFromOrigin } from "./webauthn.server";
import { logEvent } from "./proxy.server";

/**
 * Passwordless sign-in with a registered hardware key or passkey. The
 * assertion proves possession of a credential this broker already trusts;
 * only then does the identity provider mint a session for its owner.
 */

const CHALLENGE_TTL_MS = 2 * 60_000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function signInOptions(origin: string) {
  const { rpID } = rpFromOrigin(origin);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });
  const db = await admin();
  const { data, error } = await db
    .from("webauthn_challenges")
    .insert({
      user_id: null,
      challenge: options.challenge,
      purpose: "signin",
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { ticket: data.id as string, options };
}

async function consumeTicket(ticket: string): Promise<string> {
  const db = await admin();
  const { data } = await db
    .from("webauthn_challenges")
    .select("id, challenge, expires_at, consumed_at")
    .eq("id", ticket)
    .eq("purpose", "signin")
    .maybeSingle();
  if (!data || data.consumed_at) throw new Error("Sign-in challenge is no longer valid");
  if (new Date(data.expires_at).getTime() < Date.now()) throw new Error("Sign-in challenge expired");
  await db
    .from("webauthn_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);
  return data.challenge as string;
}

/** Verified assertion -> a one-time link token the browser exchanges for a session. */
export async function signInVerify(input: {
  ticket: string;
  origin: string;
  response: AuthenticationResponseJSON;
}) {
  const db = await admin();
  const { rpID, origin } = rpFromOrigin(input.origin);
  const expectedChallenge = await consumeTicket(input.ticket);

  const { data: cred } = await db
    .from("webauthn_credentials")
    .select("*")
    .eq("credential_id", input.response.id)
    .maybeSingle();
  if (!cred) throw new Error("This passkey is not registered with the broker");

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: cred.credential_id as string,
      publicKey: fromB64url(cred.public_key as string),
      counter: Number(cred.counter),
      transports: (cred.transports ?? []) as never,
    },
  });
  if (!verification.verified) throw new Error("Passkey assertion failed");

  await db
    .from("webauthn_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", cred.id);

  const userId = cred.user_id as string;
  const { data: account } = await db.auth.admin.getUserById(userId);
  const email = account?.user?.email;
  if (!email) throw new Error("This passkey has no addressable identity");

  const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link.properties?.hashed_token) {
    throw new Error(error?.message ?? "Could not mint a session for this passkey");
  }

  await logEvent({
    user_id: userId,
    event: "webauthn.signin",
    message: `Passkey sign-in with "${cred.label ?? "security key"}"`,
  });

  return { tokenHash: link.properties.hashed_token as string };
}
