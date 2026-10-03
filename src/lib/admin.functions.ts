// Admin-only endpoints. Every handler verifies the caller has the "admin" role
// in user_roles before using privileged database access.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Unauthorized administrator account.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const checkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

// Bootstrap: the very first signed-in account may claim admin, only while no
// admin exists yet. After that, nobody can promote themselves.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An administrator already exists. Ask them to grant you access.");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const hasAnyAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [posts, comments, reports, bans, cats] = await Promise.all([
      db.from("posts").select("id,title,content,category,author_name,client_id,status,reports_count,love,funny,agree,wow,created_at").order("created_at", { ascending: false }).limit(500),
      db.from("comments").select("id", { count: "exact", head: true }),
      db.from("reports").select("id,post_id,reason,details,status,created_at,posts(title,status)").order("created_at", { ascending: false }).limit(300),
      db.from("banned_clients").select("*").order("banned_at", { ascending: false }),
      db.from("categories").select("*").order("sort"),
    ]);
    return {
      posts: posts.data ?? [],
      commentsCount: comments.count ?? 0,
      reports: (reports.data ?? []) as any[],
      bans: bans.data ?? [],
      categories: cats.data ?? [],
    };
  });

export const setPostStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["active", "hidden"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await db.from("posts").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await db.from("posts").delete().eq("id", data.id);
    return { ok: true };
  });

export const setReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "reviewed", "dismissed"]), removePost: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { data: r } = await db.from("reports").update({ status: data.status }).eq("id", data.id).select("post_id").single();
    if (data.removePost && r) await db.from("posts").update({ status: "hidden" }).eq("id", r.post_id);
    return { ok: true };
  });

// Bans are tied to the anonymous browser ID and can be bypassed by clearing
// storage or switching devices. Stronger enforcement needs extra server signals.
export const banClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().min(1).max(100), reason: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await db.from("banned_clients").upsert({ client_id: data.clientId, reason: data.reason });
    return { ok: true };
  });

export const unbanClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await db.from("banned_clients").delete().eq("client_id", data.clientId);
    return { ok: true };
  });

export const toggleCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await db.from("categories").update({ active: data.active }).eq("id", data.id);
    return { ok: true };
  });
