import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/campus";
import { getClientId } from "@/lib/clientId";
import { reportPost } from "@/lib/posts.functions";
import { cn } from "@/lib/utils";

export function ReportButton({ postId }: { postId: string }) {
  const submit = useServerFn(reportPost);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!reason) return;
    setBusy(true); setErr("");
    try {
      await submit({ data: { postId, reason, details, clientId: getClientId() } });
      setDone(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); setDone(false); setReason(null); setDetails(""); }}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
      >
        <Flag className="h-4 w-4" /> Report
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          {done ? (
            <div className="py-6 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-success" />
              <h3 className="mt-3 text-xl font-bold">Report Submitted</h3>
              <p className="mt-1 text-muted-foreground">Thank you for helping keep Campus Whisper safe.</p>
              <Button className="mt-5 rounded-full" onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report this post</DialogTitle>
                <DialogDescription>Reports are anonymous and reviewed by school admins.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium",
                      reason === r ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >{r}</button>
                ))}
              </div>
              <Textarea placeholder="Anything else? (optional)" maxLength={300} value={details} onChange={(e) => setDetails(e.target.value)} />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button disabled={!reason || busy} onClick={send} className="rounded-full">
                {busy ? "Submitting…" : "Submit report"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
