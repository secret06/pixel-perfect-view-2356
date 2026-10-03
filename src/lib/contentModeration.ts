// Basic keyword moderation. Kept isolated so it can later be swapped for an
// AI or server-side moderation service. Used on both the client (fast feedback)
// and the server (enforcement). Content is never silently deleted — callers
// show the returned message instead.

const BLOCKED_PATTERNS: RegExp[] = [
  /\bkill (yo)?u(rself)?\b/i,
  /\bkys\b/i,
  /\bi('?ll| will) (hurt|kill|shoot|stab)\b/i,
  /\bbomb (the|this) (school|campus)\b/i,
  /\bslut\b/i,
  /\bwhore\b/i,
  /\bretard(ed)?\b/i,
  /\bfaggot\b/i,
  /\bnigg(a|er)\b/i,
  /\bnudes?\b/i,
  /\bporn\b/i,
  /\bpatayin\b/i,
  /\bputang ?ina\b/i,
];

export type ModerationResult = { ok: true } | { ok: false; message: string };

export function moderate(...texts: string[]): ModerationResult {
  const joined = texts.join(" \n ");
  if (BLOCKED_PATTERNS.some((p) => p.test(joined))) {
    return {
      ok: false,
      message:
        "Your message contains language that may be bullying, threatening, hateful or explicit. Please rephrase it to keep Campus Whisper safe.",
    };
  }
  return { ok: true };
}
