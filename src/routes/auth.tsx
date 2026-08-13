import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
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

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
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
    void navigate({ to: "/" });
  }

  async function sso(provider: "google" | "microsoft") {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
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
            {mode === "signin" ? "Sign in" : "Create operator"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Console access is per-operator. Put Cloudflare Access in front of this origin to make it
            the only network path.
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
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void sso("google")}>
              Google
            </Button>
            <Button variant="outline" onClick={() => void sso("microsoft")}>
              Entra ID
            </Button>
          </div>
          <button
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an operator account?" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
