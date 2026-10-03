import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { CATEGORY_EMOJI, timeAgo, type PublicPost } from "@/lib/campus";
import { ReactionBar } from "./ReactionBar";
import { ReportButton } from "./ReportDialog";

export function Avatar({ name, anonymous }: { name: string; anonymous: boolean }) {
  return (
    <div className={anonymous ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-lg" : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground"}>
      {anonymous ? "🤫" : name.charAt(0).toUpperCase()}
    </div>
  );
}

export function PostCard({ post, full = false }: { post: PublicPost; full?: boolean }) {
  const body = (
    <>
      <div className="flex items-start gap-3">
        <Avatar name={post.author_name} anonymous={post.is_anonymous} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{post.author_name}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</div>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          {CATEGORY_EMOJI[post.category]} {post.category}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug">{post.title}</h3>
      <p className={full ? "mt-2 whitespace-pre-wrap text-[15px] leading-relaxed" : "mt-2 line-clamp-4 whitespace-pre-wrap text-[15px] leading-relaxed"}>
        {post.content}
      </p>
    </>
  );
  return (
    <article className="rounded-3xl border bg-card p-5 shadow-card transition-shadow hover:shadow-pop">
      {full ? body : <Link to="/post/$id" params={{ id: post.id }} className="block">{body}</Link>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <ReactionBar post={post} />
        <div className="flex items-center gap-1">
          <Link to="/post/$id" params={{ id: post.id }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted">
            <MessageCircle className="h-4 w-4" /> {post.comments_count} Comments
          </Link>
          <ReportButton postId={post.id} />
        </div>
      </div>
    </article>
  );
}
