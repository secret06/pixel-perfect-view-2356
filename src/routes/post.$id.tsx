import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PostCard, Avatar } from "@/components/PostCard";
import { AnonToggle } from "@/components/AnonToggle";
import { LIMITS, timeAgo, type PublicComment, type PublicPost } from "@/lib/campus";
import { moderate } from "@/lib/contentModeration";
import { getClientId } from "@/lib/clientId";
import { addComment, getPost } from "@/lib/posts.functions";

const postQuery = (id: string) => queryOptions({ queryKey: ["post", id], queryFn: () => getPost({ data: { id } }) });

export const Route = createFileRoute("/post/$id")({
  head: () => ({
    meta: [
      { title: "Whisper — Campus Whisper" },
      { name: "description", content: "Read and reply to this whisper on Campus Whisper." },
      { property: "og:title", content: "A whisper on Campus Whisper" },
      { property: "og:description", content: "Read and reply anonymously or with your name." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostDetails,
});

function PostDetails() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(postQuery(id));
  const send = useServerFn(addComment);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!text.trim()) return setErr("Write something first.");
    if (!anon && !name.trim()) return setErr("Please enter your display name.");
    const mod = moderate(text, anon ? "" : name);
    if (!mod.ok) return setErr(mod.message);
    setBusy(true);
    try {
      await send({ data: { postId: id, content: text, isAnonymous: anon, displayName: anon ? undefined : name, clientId: getClientId() } });
      setText("");
      await qc.invalidateQueries({ queryKey: ["post", id] });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link to="/feed" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>
        {isLoading && <div className="h-64 animate-pulse rounded-3xl bg-muted" />}
        {!isLoading && !data && <p className="rounded-3xl border p-10 text-center text-muted-foreground">This whisper isn't available.</p>}
        {data && (
          <>
            <PostCard post={data.post as PublicPost} full />
            <section className="mt-6 rounded-3xl border bg-card p-5 shadow-card">
              <h2 className="text-lg font-bold">Comments ({data.comments.length})</h2>
              <form onSubmit={submit} className="mt-4 space-y-3">
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={LIMITS.comment} placeholder="Write a comment…"
                  className="min-h-24 w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
                <AnonToggle value={anon} onChange={setAnon} />
                {!anon && (
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.name} placeholder="Your name"
                    className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
                )}
                {err && <p className="text-sm font-medium text-destructive">{err}</p>}
                <button disabled={busy} className="rounded-full bg-brand px-6 py-2.5 font-semibold text-primary-foreground shadow-pop disabled:opacity-60">
                  {busy ? "Posting…" : "Comment"}
                </button>
              </form>
              <div className="mt-6 space-y-4">
                {(data.comments as PublicComment[]).map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar name={c.author_name} anonymous={c.is_anonymous} />
                    <div className="flex-1 rounded-2xl bg-muted px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold">{c.author_name}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
                    </div>
                  </div>
                ))}
                {data.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Say something nice.</p>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
