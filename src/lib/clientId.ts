// Anonymous browser identifier, used for abuse tracking (bans, rate limits,
// duplicate reactions). Never displayed publicly.
// NOTE: clearing browser storage or switching devices creates a new ID, so
// bans tied to it can be bypassed. Stronger bans need server-side signals.

const KEY = "cw_client_id";
const POSTS_KEY = "cw_post_times";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Client-side rate limiting is only for basic spam prevention. A production
// application should enforce rate limits on the server — which this app also
// does (5 posts / hour per client ID) inside the createPost server function.
export function canPostLocally(max = 5): boolean {
  const hourAgo = Date.now() - 3600_000;
  const times: number[] = JSON.parse(localStorage.getItem(POSTS_KEY) || "[]").filter(
    (t: number) => t > hourAgo,
  );
  return times.length < max;
}

export function recordLocalPost() {
  const hourAgo = Date.now() - 3600_000;
  const times: number[] = JSON.parse(localStorage.getItem(POSTS_KEY) || "[]").filter(
    (t: number) => t > hourAgo,
  );
  times.push(Date.now());
  localStorage.setItem(POSTS_KEY, JSON.stringify(times));
}

const REACT_KEY = "cw_reacted";
export function getReacted(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  return JSON.parse(localStorage.getItem(REACT_KEY) || "{}");
}
export function setReacted(postId: string, kind: string, on: boolean) {
  const all = getReacted();
  const set = new Set(all[postId] || []);
  if (on) set.add(kind);
  else set.delete(kind);
  all[postId] = [...set];
  localStorage.setItem(REACT_KEY, JSON.stringify(all));
}
