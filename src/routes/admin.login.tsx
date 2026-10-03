import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkAdmin, claimFirstAdmin, hasAnyAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Login — Campus Whisper" },
      { name: "description", content: "Administrator sign in for Campus Whisper moderation." },
      { property: "og:title", content: "Admin Login — Campus Whisper" },
      { property: "og:description", content: "Administrator sign in for Campus Whisper." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const check = useServerFn(checkAdmin);
  const claim = useServerFn(claimFirstAdmin);
  const anyAdmin = useServerFn(hasAnyAdmin);
  const [setupMode, setSetupMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { anyAdmin().then((r) => setSetupMode(!r.exists)); }, []);

  async function verifyAndGo() {
    const { isAdmin } = await check();
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error("Unauthorized administrator account.");
    }
    navigate({ to: "/admin" });
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await verifyAndGo();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function setup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin/login` } });
      if (error) throw error;
      if (!data.session) {
        setMsg("Check your email to confirm the account, then come back and sign in to finish setup.");
        return;
      }
      await claim();
      await verifyAndGo();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  // After email confirmation: signed in but no admin yet → claim.
  async function signInAndClaim(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await claim();
      await verifyAndGo();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  const field = "w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={setupMode ? setup : signIn} className="w-full max-w-sm space-y-4 rounded-3xl border bg-card p-8 shadow-card">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl">🛡️</div>
        <h1 className="text-2xl font-bold">{setupMode ? "Set up first admin" : "Admin sign in"}</h1>
        <p className="text-sm text-muted-foreground">
          {setupMode ? "No administrator exists yet. The first account created here becomes the admin." : "For Campus Whisper moderators only."}
        </p>
        <input className={field} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} type="password" required minLength={8} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg && <p className="text-sm font-medium text-destructive">{msg}</p>}
        <button disabled={busy} className="w-full rounded-full bg-brand py-3 font-bold text-primary-foreground shadow-pop disabled:opacity-60">
          {busy ? "Please wait…" : setupMode ? "Create admin account" : "Sign in"}
        </button>
        {setupMode && (
          <button type="button" onClick={signInAndClaim} className="w-full text-sm font-semibold text-muted-foreground hover:text-foreground">
            Already confirmed your email? Sign in & finish setup
          </button>
        )}
      </form>
    </div>
  );
}
