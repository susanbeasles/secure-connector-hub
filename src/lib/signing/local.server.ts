import type { Signer } from "./types";

/**
 * Software fallback signer. Deterministically derived from the vault key so the
 * broker keeps a stable identity without KMS — swap in the KMS signer for real
 * hardware custody without touching a single caller.
 */

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of view) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let keyPair: Promise<CryptoKeyPair> | null = null;

function pair(): Promise<CryptoKeyPair> {
  keyPair ??= crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  return keyPair;
}

export function localSigner(): Signer {
  return {
    custody: () => "local",
    async keyId() {
      const jwk = await this.publicJwk();
      return b64url(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(jwk.x) + String(jwk.y))),
      ).slice(0, 16);
    },
    async publicJwk() {
      const { publicKey } = await pair();
      return crypto.subtle.exportKey("jwk", publicKey);
    },
    async sign(input: string) {
      const { privateKey } = await pair();
      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateKey,
        new TextEncoder().encode(input),
      );
      return b64url(signature);
    },
  };
}
