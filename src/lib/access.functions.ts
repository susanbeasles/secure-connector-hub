import { createServerFn } from "@tanstack/react-start";
import { requireOperator } from "./operator.middleware";

/** Console readout of the edge gate: configuration only, never the assertion. */
export const accessGate = createServerFn({ method: "POST" })
  .middleware([requireOperator])
  .handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { accessStatus, verifyAccess } = await import("./access/index.server");
    const verdict = await verifyAccess(getRequest(), "console");
    return {
      ...accessStatus(),
      allowed: verdict.allowed,
      reason: verdict.reason,
      identityEmail: verdict.identity?.email ?? null,
    };
  });
