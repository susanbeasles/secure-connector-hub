import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { startPasskeySignIn, finishPasskeySignIn } from "@/lib/passkey.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Aegis Broker Console" },
      {
        name: "description",
        content:
          "Authenticate to the Aegis zero-trust console for custom MCP servers and least-privilege connectors.",
      },
      { property: "og:title", content: "Sign in — Aegis Broker Console" },
      {
        property: "og:description",
        content: "Operator access to the zero-trust MCP and connector control plane.",
      },
    ],
  }),
  component: AuthPage,
});

/** Only same-origin relative paths survive; anything else falls back to the fleet. */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  const value = decodeURIComponent(raw);
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const next = safeNext(
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("next"),
  );

  useEffect(() => {
    if (!loading && session) window.location.replace(next);
  }, [loading, session, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const returnTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}`;
    const res =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: returnTo },
          });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (mode === "signup" && !res.data.session) {
      toast.success("Check your email to confirm.");
      return;
    }
    window.location.replace(next);
  }

  async function passkey() {
    setBusy(true);
    try {
      const origin = window.location.origin;
      const { ticket, options } = await startPasskeySignIn({ data: { origin } });
      const response = await startAuthentication({ optionsJSON: options as never });
      const { tokenHash } = await finishPasskeySignIn({ data: { origin, ticket, response } });
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      if (error) throw error;
      window.location.replace(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Passkey sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function sso(provider: "google") {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      return;
    }
    if (result.redirected) return;
    window.location.replace(next);
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Aegis Broker</h1>
        </div>
        <div className="panel p-6">
          <p className="label-caps">Operator access</p>
          <h2 className="mt-1 text-xl font-semibold">
            {mode === "signin" ? "Sign in" : "Claim or redeem a seat"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite-only. The first identity to sign in claims ownership of this broker; after that,
            only addresses the owner added get in — creating an account grants nothing on its own.
          </p>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <Button
            variant="outline"
            className="mt-3 w-full"
            disabled={busy}
            onClick={() => void passkey()}
          >
            <Fingerprint className="size-4" /> Security key or passkey
          </Button>
          <Button variant="outline" className="mt-3 w-full" onClick={() => void sso("google")}>
            Google
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Passkeys must be registered from Security settings on a signed-in session first.
          </p>

          <button
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Owner or invited? Create your login" : "Already have a login? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
