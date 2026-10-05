import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  banClient, checkAdmin, deletePost, getDashboard, setPostStatus, setReportStatus, toggleCategory, unbanClient,
} from "@/lib/admin.functions";
import { REACTIONS } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });
    // Signed-in is not enough: the account must have the admin role.
    const { isAdmin } = await checkAdmin();
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw redirect({ to: "/admin/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Campus Whisper" },
      { name: "description", content: "Moderate posts, reports and bans on Campus Whisper." },
      { property: "og:title", content: "Admin Dashboard — Campus Whisper" },
      { property: "og:description", content: "Moderation tools for Campus Whisper." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

const TABS = ["Dashboard", "Reports", "Posts", "Bans", "Categories"] as const;

function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDash = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["admin-dash"], queryFn: () => fetchDash() });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Dashboard");
  const setStatus = useServerFn(setPostStatus);
  const del = useServerFn(deletePost);
  const setReport = useServerFn(setReportStatus);
  const ban = useServerFn(banClient);
  const unban = useServerFn(unbanClient);
  const toggleCat = useServerFn(toggleCategory);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-dash"] });

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  const posts = data?.posts ?? [];
  const reports = data?.reports ?? [];
  const removed = posts.filter((p) => p.status === "hidden").length;
  const byCat = posts.reduce<Record<string, number>>((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {});
  const maxCat = Math.max(1, ...Object.values(byCat));
  const total = (p: (typeof posts)[number]) => p.love + p.funny + p.agree + p.wow;
  const mostReacted = [...posts].sort((a, b) => total(b) - total(a)).slice(0, 5);
  const mostReported = [...posts].filter((p) => p.reports_count > 0).sort((a, b) => b.reports_count - a.reports_count).slice(0, 5);

  const btn = "rounded-full px-3 py-1 text-xs font-semibold";
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-display text-lg font-bold">🛡️ Campus Whisper Admin</Link>
          <button onClick={signOut} className="rounded-full border px-4 py-1.5 text-sm font-semibold hover:bg-muted">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded-full px-4 py-2 text-sm font-semibold", tab === t ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted")}>{t}</button>
          ))}
        </div>
        {!data && <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />}
        {data && tab === "Dashboard" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[["Total Posts", posts.length], ["Total Comments", data.commentsCount], ["Total Reports", reports.length], ["Removed Posts", removed]].map(([l, v]) => (
                <div key={l} className="rounded-3xl border bg-card p-5 shadow-card">
                  <div className="text-sm text-muted-foreground">{l}</div>
                  <div className="mt-1 font-display text-3xl font-bold">{v}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border bg-card p-5 shadow-card">
                <h3 className="font-bold">Posts by category</h3>
                <div className="mt-3 space-y-2">
                  {Object.entries(byCat).map(([c, n]) => (
                    <div key={c}>
                      <div className="flex justify-between text-sm"><span>{c}</span><span>{n}</span></div>
                      <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-brand" style={{ width: `${(n / maxCat) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border bg-card p-5 shadow-card">
                <h3 className="font-bold">Most reacted</h3>
                <ol className="mt-3 space-y-2 text-sm">{mostReacted.map((p) => <li key={p.id} className="flex justify-between gap-2"><span className="truncate">{p.title}</span><span className="font-semibold">{total(p)}</span></li>)}</ol>
              </div>
              <div className="rounded-3xl border bg-card p-5 shadow-card">
                <h3 className="font-bold">Most reported</h3>
                <ol className="mt-3 space-y-2 text-sm">
                  {mostReported.length === 0 && <li className="text-muted-foreground">No reports yet.</li>}
                  {mostReported.map((p) => <li key={p.id} className="flex justify-between gap-2"><span className="truncate">{p.title}</span><span className="font-semibold text-destructive">{p.reports_count}</span></li>)}
                </ol>
              </div>
            </div>
          </div>
        )}
        {data && tab === "Reports" && (
          <Table head={["Reason", "Post", "Date", "Status", "Actions"]}>
            {reports.map((r: any) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3 font-semibold">{r.reason}{r.details && <div className="font-normal text-muted-foreground">{r.details}</div>}</td>
                <td className="p-3">{r.posts?.title ?? "—"}{r.posts?.status === "hidden" && <span className="ml-2 text-xs text-destructive">(hidden)</span>}</td>
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <Link to="/post/$id" params={{ id: r.post_id }} target="_blank" className={cn(btn, "bg-muted")}>Review</Link>
                    <button className={cn(btn, "bg-destructive text-destructive-foreground")} onClick={async () => { await setReport({ data: { id: r.id, status: "reviewed", removePost: true } }); refresh(); }}>Remove Post</button>
                    <button className={cn(btn, "bg-secondary text-secondary-foreground")} onClick={async () => { await setReport({ data: { id: r.id, status: "dismissed" } }); refresh(); }}>Dismiss</button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {data && tab === "Posts" && (
          <Table head={["Author", "Title", "Category", "Date", "Reports", "Reacts", "Status", "Actions"]}>
            {posts.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.author_name}</td>
                <td className="max-w-56 truncate p-3 font-semibold">{p.title}</td>
                <td className="p-3">{p.category}</td>
                <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3">{p.reports_count}</td>
                <td className="p-3 whitespace-nowrap">{REACTIONS.map((r) => `${r.emoji}${p[r.key]}`).join(" ")}</td>
                <td className="p-3 capitalize">{p.status}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <Link to="/post/$id" params={{ id: p.id }} target="_blank" className={cn(btn, "bg-muted")}>View</Link>
                    <button className={cn(btn, "bg-secondary text-secondary-foreground")} onClick={async () => { await setStatus({ data: { id: p.id, status: p.status === "active" ? "hidden" : "active" } }); refresh(); }}>{p.status === "active" ? "Hide" : "Restore"}</button>
                    <button className={cn(btn, "bg-destructive text-destructive-foreground")} onClick={async () => { if (confirm("Delete this post permanently?")) { await del({ data: { id: p.id } }); refresh(); } }}>Delete</button>
                    {p.client_id !== "seed" && (
                      <button className={cn(btn, "border")} onClick={async () => { const reason = prompt("Reason for banning this device?") ; if (reason !== null) { await ban({ data: { clientId: p.client_id, reason } }); refresh(); } }}>Ban author</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {data && tab === "Bans" && (
          <>
            <p className="mt-6 text-sm text-muted-foreground">Bans apply to the poster's browser. Someone can get around a ban by clearing their browser or switching devices.</p>
            <Table head={["Device ID", "Reason", "Banned", ""]}>
              {data.bans.map((b) => (
                <tr key={b.client_id} className="border-t">
                  <td className="p-3 font-mono text-xs">{b.client_id.slice(0, 8)}…</td>
                  <td className="p-3">{b.reason || "—"}</td>
                  <td className="p-3">{new Date(b.banned_at).toLocaleString()}</td>
                  <td className="p-3"><button className={cn(btn, "bg-muted")} onClick={async () => { await unban({ data: { clientId: b.client_id } }); refresh(); }}>Unban</button></td>
                </tr>
              ))}
            </Table>
          </>
        )}
        {data && tab === "Categories" && (
          <Table head={["Category", "Status", ""]}>
            {data.categories.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-semibold">{c.name}</td>
                <td className="p-3">{c.active ? "Active" : "Disabled"}</td>
                <td className="p-3"><button className={cn(btn, "bg-muted")} onClick={async () => { await toggleCat({ data: { id: c.id, active: !c.active } }); refresh(); }}>{c.active ? "Disable" : "Enable"}</button></td>
              </tr>
            ))}
          </Table>
        )}
      </main>
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-3xl border bg-card shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground"><tr>{head.map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
