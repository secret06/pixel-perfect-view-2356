// Public (guest) endpoints. Students have no accounts, so every write goes
// through these server functions, which validate input, run moderation,
// check bans and enforce rate limits before touching the database.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATEGORIES, LIMITS, REPORT_REASONS } from "./campus";
import { moderate } from "./contentModeration";

const POST_COLS =
  "id,title,content,category,is_anonymous,author_name,love,funny,agree,wow,comments_count,created_at";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertNotBanned(db: Awaited<ReturnType<typeof admin>>, clientId: string) {
  const { data } = await db.from("banned_clients").select("client_id").eq("client_id", clientId).maybeSingle();
  if (data) throw new Error("This device has been restricted from posting due to community guideline violations.");
}

const clientIdSchema = z.string().uuid();

export const listPosts = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ category: z.string().optional(), q: z.string().max(100).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    let query = db.from("posts").select(POST_COLS).eq("status", "active").order("created_at", { ascending: false }).limit(100);
    if (data.category && data.category !== "All") query = query.eq("category", data.category);
    if (data.q?.trim()) {
      const q = data.q.trim().replace(/[%,()]/g, " ");
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: post } = await db.from("posts").select(POST_COLS).eq("id", data.id).eq("status", "active").maybeSingle();
    if (!post) return null;
    const { data: comments } = await db
      .from("comments")
      .select("id,content,author_name,is_anonymous,created_at")
      .eq("post_id", data.id)
      .order("created_at", { ascending: true });
    return { post, comments: comments ?? [] };
  });

export const createPost = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        title: z.string().trim().min(1).max(LIMITS.title),
        content: z.string().trim().min(1).max(LIMITS.message),
        category: z.enum(CATEGORIES),
        isAnonymous: z.boolean(),
        displayName: z.string().trim().max(LIMITS.name).optional(),
        clientId: clientIdSchema,
      })
      .refine((v) => v.isAnonymous || (v.displayName && v.displayName.length > 0), "Display name is required")
      .parse(d),
  )
  .handler(async ({ data }) => {
    const mod = moderate(data.title, data.content, data.displayName ?? "");
    if (!mod.ok) throw new Error(mod.message);
    const db = await admin();
    await assertNotBanned(db, data.clientId);
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from("posts").select("id", { count: "exact", head: true }).eq("client_id", data.clientId).gte("created_at", since);
    if ((count ?? 0) >= 5) throw new Error("You've reached the limit of 5 posts per hour. Please try again later.");
    const { data: row, error } = await db
      .from("posts")
      .insert({
        title: data.title,
        content: data.content,
        category: data.category,
        is_anonymous: data.isAnonymous,
        author_name: data.isAnonymous ? "Anonymous Student" : data.displayName!,
        client_id: data.clientId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const addComment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        postId: z.string().uuid(),
        content: z.string().trim().min(1).max(LIMITS.comment),
        isAnonymous: z.boolean(),
        displayName: z.string().trim().max(LIMITS.name).optional(),
        clientId: clientIdSchema,
      })
      .refine((v) => v.isAnonymous || (v.displayName && v.displayName.length > 0), "Display name is required")
      .parse(d),
  )
  .handler(async ({ data }) => {
    const mod = moderate(data.content, data.displayName ?? "");
    if (!mod.ok) throw new Error(mod.message);
    const db = await admin();
    await assertNotBanned(db, data.clientId);
    const { error } = await db.from("comments").insert({
      post_id: data.postId,
      content: data.content,
      is_anonymous: data.isAnonymous,
      author_name: data.isAnonymous ? "Anonymous Student" : data.displayName!,
      client_id: data.clientId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ postId: z.string().uuid(), kind: z.enum(["love", "funny", "agree", "wow"]), clientId: clientIdSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: on, error } = await db.rpc("toggle_reaction", { _post: data.postId, _client: data.clientId, _kind: data.kind });
    if (error) throw new Error(error.message);
    return { on: !!on };
  });

export const reportPost = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        postId: z.string().uuid(),
        reason: z.enum(REPORT_REASONS),
        details: z.string().trim().max(300).optional(),
        clientId: clientIdSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("reports").insert({
      post_id: data.postId,
      reason: data.reason,
      details: data.details || null,
      reported_by_client_id: data.clientId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
