import { createFileRoute } from "@tanstack/react-router";
import { jsonHeaders } from "@/lib/oauth-metadata";

/** Public half of the broker's signing key, so anyone can verify grant receipts. */
export const Route = createFileRoute("/_/well-known/jwks/json" as never)({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: jsonHeaders }),
      GET: async () => {
        const { signer } = await import("@/lib/signing/index.server");
        const s = signer();
        const jwk = await s.publicJwk();
        return new Response(
          JSON.stringify({
            keys: [{ ...jwk, kid: await s.keyId(), use: "sig", alg: "ES256", key_ops: undefined }],
          }),
          { headers: jsonHeaders },
        );
      },
    },
  },
});
