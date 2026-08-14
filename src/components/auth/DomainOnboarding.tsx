import { useState } from "react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkClaim, domainSession, openClaim } from "@/lib/domain/domain.functions";
import { adoptSession } from "@/routes/auth";

type Claim = Awaited<ReturnType<typeof openClaim>>;

/**
 * Proof of the zone outranks proof of a mailbox: whoever can publish DNS for a
 * domain can already mint any address inside it, so a mailbox challenge on top
 * adds ceremony, not assurance.
 */
export function DomainOnboarding({ next, onBack }: { next: string; onBack: () => void }) {
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);

  async function guard(run: () => Promise<void>) {
    setBusy(true);
    try {
      await run();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  const open = () =>
    guard(async () => {
      setClaim(await openClaim({ data: { domain } }));
    });

  const check = () =>
    guard(async () => {
      if (!claim) return;
      const result = await checkClaim({ data: { id: claim.id } });
      setClaim(result);
      if (result.status === "verified") toast.success("Zone verified");
      else toast.message("Record not visible yet — DNS may still be propagating");
    });

  const enter = () =>
    guard(async () => {
      await adoptSession(await domainSession({ data: { email } }), next);
    });

  const verified = claim?.status === "verified";

  return (
    <div className="mt-5 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="domain">Domain</Label>
        <div className="flex gap-2">
          <Input
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="company.com"
            disabled={!!claim}
          />
          <Button variant="outline" disabled={busy || !domain || !!claim} onClick={open}>
            Start
          </Button>
        </div>
      </div>

      {claim ? (
        <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
          <p className="label-caps">Publish this TXT record</p>
          <div className="space-y-1 font-mono text-[11px] break-all">
            <p>{claim.recordName}</p>
            <p className="text-muted-foreground">{claim.recordValue}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(claim.recordValue);
                toast.success("Copied");
              }}
            >
              <Copy className="size-3.5" /> Copy value
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={check}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} Check DNS
            </Button>
          </div>
          {verified ? (
            <p className="flex items-center gap-1.5 text-xs text-primary">
              <CheckCircle2 className="size-3.5" /> Verified — bind your IdP from the console after
              you enter.
            </p>
          ) : null}
        </div>
      ) : null}

      {verified ? (
        <div className="space-y-1.5">
          <Label htmlFor="domain-email">Address inside {claim?.domain}</Label>
          <Input
            id="domain-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`you@${claim?.domain ?? "company.com"}`}
          />
          <Button className="w-full" disabled={busy || !email} onClick={enter}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Enter as this identity
          </Button>
        </div>
      ) : null}

      <button
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        Back
      </button>
    </div>
  );
}
