// Shared, browser-safe constants and helpers for Campus Whisper.

export const CATEGORIES = [
  "Confession",
  "Crush",
  "Compliment",
  "Question",
  "Suggestion",
  "Campus Issue",
  "Meme",
] as const;

export const REACTIONS = [
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "funny", emoji: "😂", label: "Funny" },
  { key: "agree", emoji: "👍", label: "Agree" },
  { key: "wow", emoji: "😮", label: "Wow" },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]["key"];

export const REPORT_REASONS = [
  "Bullying",
  "Spam",
  "Harassment",
  "Threats",
  "Hate Speech",
  "Explicit Content",
  "Other",
] as const;

export const LIMITS = { title: 100, message: 1000, name: 50, comment: 500 };

export const CATEGORY_EMOJI: Record<string, string> = {
  Confession: "🤫",
  Crush: "💘",
  Compliment: "🌷",
  Question: "❓",
  Suggestion: "💡",
  "Campus Issue": "📢",
  Meme: "😹",
};

export type PublicPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_anonymous: boolean;
  author_name: string;
  love: number;
  funny: number;
  agree: number;
  wow: number;
  comments_count: number;
  created_at: string;
};

export type PublicComment = {
  id: string;
  content: string;
  author_name: string;
  is_anonymous: boolean;
  created_at: string;
};

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}
