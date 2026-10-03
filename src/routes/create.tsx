import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AnonToggle } from "@/components/AnonToggle";
import { CATEGORIES, CATEGORY_EMOJI, LIMITS } from "@/lib/campus";
import { moderate } from "@/lib/contentModeration";
import { canPostLocally, getClientId, recordLocalPost } from "@/lib/clientId";
import { createPost } from "@/lib/posts.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "New Whisper — Campus Whisper" },
      { name: "description", content: "Post a confession, crush, compliment, question or campus issue — anonymously if you like." },
      { property: "og:title", content: "New Whisper — Campus Whisper" },
      { property: "og:description", content: "Post anonymously or with your name. No login needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreatePost,
});

function CreatePost() {
  const navigate = useNavigate();
  const create = useServerFn(createPost);
  const [cats, setCats] = useState<string[]>([...CATEGORIES]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [anon, setAnon] = useState(true);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("name").eq("active", true).order("sort").then(({ data }) => {
      if (data?.length) setCats(data.map((d) => d.name));
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!title.trim()) return setErr("Title is required.");
    if (!content.trim()) return setErr("Message is required.");
    if (!category) return setErr("Please choose a category.");
    if (!anon && !name.trim()) return setErr("Please enter your display name, or post anonymously.");
    const mod = moderate(title, content, anon ? "" : name);
    if (!mod.ok) return setErr(mod.message);
    if (!canPostLocally()) return setErr("You've reached the limit of 5 posts per hour. Please try again later.");
    setBusy(true);
    try {
      const res = await create({
        data: { title, content, category: category as (typeof CATEGORIES)[number], isAnonymous: anon, displayName: anon ? undefined : name, clientId: getClientId() },
      });
      recordLocalPost();
      navigate({ to: "/post/$id", params: { id: res.id } });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-4xl font-extrabold">Send a <span className="text-brand">whisper</span></h1>
        <p className="mt-2 text-muted-foreground">Say what you've been holding in. Be kind.</p>
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-3xl border bg-card p-6 shadow-card">
          <div>
            <label className="mb-2 block text-sm font-semibold">Category</label>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", category === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {CATEGORY_EMOJI[c]} {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm"><label className="font-semibold">Title</label><span className="text-muted-foreground">{title.length}/{LIMITS.title}</span></div>
            <input className={field} maxLength={LIMITS.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a headline" />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm"><label className="font-semibold">Message</label><span className="text-muted-foreground">{content.length}/{LIMITS.message}</span></div>
            <textarea className={cn(field, "min-h-40 resize-y")} maxLength={LIMITS.message} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Spill it…" />
          </div>
          <AnonToggle value={anon} onChange={setAnon} />
          {!anon && (
            <div>
              <label className="mb-2 block text-sm font-semibold">Your Name</label>
              <input className={field} maxLength={LIMITS.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we show you?" />
            </div>
          )}
          {err && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{err}</p>}
          <button disabled={busy} className="w-full rounded-full bg-brand py-3 font-bold text-primary-foreground shadow-pop disabled:opacity-60">
            {busy ? "Posting…" : `Post as ${anon ? "Anonymous Student" : name || "…"}`}
          </button>
        </form>
      </main>
    </div>
  );
}
