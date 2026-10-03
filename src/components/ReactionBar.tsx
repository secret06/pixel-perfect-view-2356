import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { REACTIONS, type PublicPost, type ReactionKey } from "@/lib/campus";
import { getClientId, getReacted, setReacted } from "@/lib/clientId";
import { toggleReaction } from "@/lib/posts.functions";
import { cn } from "@/lib/utils";

export function ReactionBar({ post }: { post: PublicPost }) {
  const toggle = useServerFn(toggleReaction);
  const [counts, setCounts] = useState<Record<ReactionKey, number>>({
    love: post.love, funny: post.funny, agree: post.agree, wow: post.wow,
  });
  const [mine, setMine] = useState<string[]>([]);
  useEffect(() => setMine(getReacted()[post.id] || []), [post.id]);

  async function react(kind: ReactionKey) {
    const on = !mine.includes(kind);
    setMine((m) => (on ? [...m, kind] : m.filter((k) => k !== kind)));
    setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (on ? 1 : -1)) }));
    try {
      const res = await toggle({ data: { postId: post.id, kind, clientId: getClientId() } });
      setReacted(post.id, kind, res.on);
    } catch {
      setMine((m) => (on ? m.filter((k) => k !== kind) : [...m, kind]));
      setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (on ? -1 : 1)) }));
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          title={r.label}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); react(r.key); }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-all active:scale-95",
            mine.includes(r.key)
              ? "border-primary/40 bg-secondary text-secondary-foreground"
              : "border-transparent bg-muted text-muted-foreground hover:bg-secondary",
          )}
        >
          <span className="text-base leading-none">{r.emoji}</span>
          {counts[r.key]}
        </button>
      ))}
    </div>
  );
}
