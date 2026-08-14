import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOperator } from "../operator.middleware";

const domain = z.string().min(4).max(253);
const id = z.string().uuid();

/** Opening a claim proves nothing on its own — it only hands out the record to publish. */
export const openClaim = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ domain }).parse(input))
  .handler(async ({ data }) => {
    const { openDomainClaim } = await import("./domain.server");
    return openDomainClaim(data.domain);
  });

export const checkClaim = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id }).parse(input))
  .handler(async ({ data }) => {
    const { checkDomainClaim } = await import("./domain.server");
    return checkDomainClaim(data.id);
  });

export const bindSso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id, kind: z.enum(["saml", "oidc"]), metadataUrl: z.string().url() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { bindDomainSso } = await import("./domain.server");
    return bindDomainSso(data);
  });

export const rotateSso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id }).parse(input))
  .handler(async ({ data }) => {
    const { rotateDomainSso } = await import("./domain.server");
    return rotateDomainSso(data.id);
  });

/** Sign in on the strength of the zone, with no mailbox challenge at all. */
export const domainSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().email().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { sessionByDomainProof } = await import("./domain.server");
    return sessionByDomainProof(data.email);
  });

export const listClaims = createServerFn({ method: "POST" })
  .middleware([requireOperator])
  .handler(async () => {
    const { listDomainClaims } = await import("./domain.server");
    return listDomainClaims();
  });
