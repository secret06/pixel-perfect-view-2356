import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/campus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Whisper — Speak Freely" },
      { name: "description", content: "Anonymous confessions, crushes, compliments and campus talk. No login needed." },
      { property: "og:title", content: "Campus Whisper — Speak Freely" },
      { property: "og:description", content: "Anonymous confessions, crushes, compliments and campus talk. No login needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4">
        <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
              No login. No profile. Just you.
            </span>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] md:text-6xl">
              Speak <span className="text-brand">Freely.</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Share your thoughts with the community — confessions, crushes, questions and campus issues, anonymously or with your name.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/create" className="rounded-full bg-brand px-6 py-3 font-semibold text-primary-foreground shadow-pop transition-transform hover:-translate-y-0.5">
                Send a whisper
              </Link>
              <Link to="/feed" className="rounded-full border bg-card px-6 py-3 font-semibold hover:bg-muted">
                Read the feed
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="rotate-[-3deg] rounded-[2rem] bg-brand p-8 text-primary-foreground shadow-pop">
              <p className="text-sm font-semibold opacity-80">🤫 Anonymous Student · 2 mins ago</p>
              <p className="mt-4 font-display text-2xl font-bold leading-snug">
                I think someone from BSIT 4A is really cute 😭
              </p>
              <div className="mt-6 flex gap-4 text-sm font-semibold">
                <span>❤️ 20</span><span>😂 5</span><span>👍 8</span><span>😮 2</span>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-2 rotate-[4deg] rounded-2xl border bg-card px-5 py-4 shadow-card">
              <p className="text-sm font-semibold">💬 12 comments</p>
            </div>
          </div>
        </section>
        <section className="pb-20">
          <h2 className="text-2xl font-bold">What's on your mind?</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link key={c} to="/feed" search={{ category: c }} className="rounded-full border bg-card px-4 py-2 font-medium hover:bg-secondary">
                {CATEGORY_EMOJI[c]} {c}
              </Link>
            ))}
          </div>
          <p className="mt-10 text-sm text-muted-foreground">
            Be kind. Bullying, threats, hate speech and explicit content are not allowed and can be reported.
          </p>
        </section>
      </main>
    </div>
  );
}
