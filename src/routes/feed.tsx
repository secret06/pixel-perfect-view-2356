import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PostCard } from "@/components/PostCard";
import { CATEGORIES, CATEGORY_EMOJI, type PublicPost } from "@/lib/campus";
import { listPosts } from "@/lib/posts.functions";
import { cn } from "@/lib/utils";

const postsQuery = (category: string, q: string) =>
  queryOptions({
    queryKey: ["posts", category, q],
    queryFn: () => listPosts({ data: { category, q } }),
  });

export const Route = createFileRoute("/feed")({
  validateSearch: z.object({ category: z.string().optional(), q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Feed — Campus Whisper" },
      { name: "description", content: "Read the latest confessions, crushes and campus talk from students." },
      { property: "og:title", content: "Feed — Campus Whisper" },
      { property: "og:description", content: "Read the latest confessions, crushes and campus talk from students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { category = "All", q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/feed" });
  const [text, setText] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== q) navigate({ search: (s) => ({ ...s, q: text || undefined }), replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [text]);
  const { data, isLoading, error } = useQuery(postsQuery(category, q));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search whispers…"
            className="h-12 w-full rounded-full border bg-card pl-12 pr-4 shadow-card outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {["All", ...CATEGORIES].map((c) => (
            <Link
              key={c}
              to="/feed"
              search={(s) => ({ ...s, category: c === "All" ? undefined : c })}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold",
                category === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {c !== "All" && CATEGORY_EMOJI[c]} {c}
            </Link>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-muted" />)}
          {error && <p className="text-destructive">Couldn't load posts. Please refresh.</p>}
          {data?.length === 0 && (
            <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
              No whispers here yet. <Link to="/create" className="font-semibold text-primary">Be the first.</Link>
            </div>
          )}
          {(data as PublicPost[] | undefined)?.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </main>
    </div>
  );
}
