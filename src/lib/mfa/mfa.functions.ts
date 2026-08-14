import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Factor state is owned by the broker, never inferred from the client session. */

export const mfaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { mfaState } = await import("./factors.server");
    return mfaState(context.userId);
  });

export const enrollFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["passkey", "totp", "sso"]),
        reference: z.string().min(1).max(200),
        label: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { recordFactor } = await import("./factors.server");
    return recordFactor({ userId: context.userId, ...data });
  });

export const removeFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { dropFactor } = await import("./factors.server");
    return dropFactor(context.userId, data.id);
  });

export const mintRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { issueRecoveryCodes } = await import("./factors.server");
    return { codes: await issueRecoveryCodes(context.userId) };
  });
