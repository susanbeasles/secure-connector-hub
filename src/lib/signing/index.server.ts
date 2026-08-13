import { kmsSigner } from "./kms.server";
import { localSigner } from "./local.server";
import type { Signer } from "./types";

let active: Signer | null = null;

/**
 * The single entry point every consumer uses to sign anything.
 * KMS is used whenever it is configured; otherwise the software key keeps the
 * broker functional and the console reports the weaker custody honestly.
 */
export function signer(): Signer {
  if (active) return active;
  const keyId = process.env["AWS_KMS_KEY_ID"];
  const region = process.env["AWS_REGION"];
  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
  active =
    keyId && region && accessKeyId && secretAccessKey
      ? kmsSigner({ keyId, region, accessKeyId, secretAccessKey })
      : localSigner();
  return active;
}

/** Compact JWS over a JSON payload, signed by whichever key is in custody. */
export async function signJws(payload: Record<string, unknown>): Promise<string> {
  const s = signer();
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const input = `${encode({ alg: "ES256", typ: "JWT", kid: await s.keyId() })}.${encode(payload)}`;
  return `${input}.${await s.sign(input)}`;
}

export type { Signer } from "./types";
