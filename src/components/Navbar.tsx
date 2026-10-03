import { Link } from "@tanstack/react-router";
import { PenLine } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg text-primary-foreground shadow-pop">🤫</span>
          <span className="font-display text-xl font-bold">Campus Whisper</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/feed"
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
          >
            Feed
          </Link>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pop transition-transform hover:-translate-y-0.5"
          >
            <PenLine className="h-4 w-4" /> <span className="hidden sm:inline">Whisper</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
