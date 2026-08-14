import { useEffect, useState } from "react";

export type WebauthnAvailability =
  | { state: "checking" }
  | { state: "ready" }
  | { state: "unsupported" }
  | { state: "blocked-frame" };

/**
 * WebAuthn dies silently in a cross-origin frame that was not delegated
 * `publickey-credentials-get`. Detect it before the button is pressed so the
 * operator gets a top-level window instead of an opaque NotAllowedError.
 */
export function useWebauthn(): WebauthnAvailability {
  const [availability, setAvailability] = useState<WebauthnAvailability>({ state: "checking" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.PublicKeyCredential) {
      setAvailability({ state: "unsupported" });
      return;
    }
    const policy = (document as unknown as { featurePolicy?: { allowsFeature(f: string): boolean } })
      .featurePolicy;
    const framed = window.self !== window.top;
    const allowed = policy
      ? policy.allowsFeature("publickey-credentials-get") &&
        policy.allowsFeature("publickey-credentials-create")
      : !framed;
    setAvailability({ state: framed && !allowed ? "blocked-frame" : "ready" });
  }, []);

  return availability;
}
