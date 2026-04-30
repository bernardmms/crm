import { apiClient } from "@/lib/api-client";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Label } from "@repo/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { UnsubscribeReason } from "@repo/api-contract";

const REASON_OPTIONS: { value: UnsubscribeReason; label: string }[] = [
  { value: "NOT_INTERESTED", label: "I'm no longer interested" },
  { value: "TOO_FREQUENT", label: "I get too many emails" },
  { value: "NEVER_SUBSCRIBED", label: "I never subscribed to this list" },
  { value: "NOT_RELEVANT", label: "The content isn't relevant to me" },
  { value: "OTHER", label: "Other" },
];

type ViewState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "ready"; email: string | null }
  | { kind: "submitting"; email: string | null }
  | { kind: "done" };

export default function UnsubscribePage() {
  const { contactId, token } = useParams<{ contactId: string; token: string }>();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [reason, setReason] = useState<UnsubscribeReason | "">("");

  useEffect(() => {
    if (!contactId || !token) {
      setState({ kind: "invalid" });
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await apiClient.unsubscribeContract.getUnsubscribeStatus({
        params: { contactId, token },
      });
      if (cancelled) return;
      if (result.status !== 200) {
        setState({ kind: "invalid" });
        return;
      }
      if (result.body.alreadyUnsubscribed) {
        setState({ kind: "done" });
        return;
      }
      setState({ kind: "ready", email: result.body.email });
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, token]);

  async function handleSubmit() {
    if (state.kind !== "ready" || !contactId || !token) return;
    setState({ kind: "submitting", email: state.email });
    const result = await apiClient.unsubscribeContract.unsubscribe({
      params: { contactId, token },
      body: { reason: reason === "" ? undefined : reason },
    });
    if (result.status === 200) {
      setState({ kind: "done" });
    } else {
      setState({ kind: "invalid" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12">
      <Card className="w-full max-w-md">
        {state.kind === "loading" && (
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            <p className="text-sm text-zinc-500">Loading…</p>
          </CardContent>
        )}

        {state.kind === "invalid" && (
          <>
            <CardHeader className="items-center text-center">
              <XCircle className="h-10 w-10 text-red-500" />
              <CardTitle>Invalid link</CardTitle>
              <CardDescription>
                This unsubscribe link is invalid or has expired. If you keep
                receiving emails you don't want, please contact us directly.
              </CardDescription>
            </CardHeader>
          </>
        )}

        {(state.kind === "ready" || state.kind === "submitting") && (
          <>
            <CardHeader>
              <CardTitle>Unsubscribe</CardTitle>
              <CardDescription>
                {state.email ? (
                  <>
                    You are about to unsubscribe{" "}
                    <strong className="text-zinc-900">{state.email}</strong> from
                    our mailing list. You won't receive any more emails from us.
                  </>
                ) : (
                  <>
                    You are about to unsubscribe from our mailing list. You won't
                    receive any more emails from us.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Select
                  value={reason}
                  onValueChange={(v) => setReason(v as UnsubscribeReason)}
                >
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason…" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={state.kind === "submitting"}
              >
                {state.kind === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Unsubscribing…
                  </>
                ) : (
                  "Confirm unsubscribe"
                )}
              </Button>
            </CardContent>
          </>
        )}

        {state.kind === "done" && (
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <CardTitle>You're unsubscribed</CardTitle>
            <CardDescription>
              You won't receive any more emails from us. Thanks for letting us
              know.
            </CardDescription>
          </CardHeader>
        )}
      </Card>
    </div>
  );
}
