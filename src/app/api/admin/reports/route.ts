import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null as any, user: null as any };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null as any, user: null as any };

  return { error: null, supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-reports", 30);
    if (rateLimited) return rateLimited;

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") ?? "pending";
    const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);
    const limit = 25;

    let query = supabase
      .from("content_reports")
      .select(`
      id, reason, details, status, created_at, reviewed_at,
      video_id, comment_id, reporter_id
    `);

    if (filter === "copyright_claims") {
      query = query.eq("reason", "copyright_claim").eq("status", "pending");
    } else if (filter !== "all") {
      query = query.eq("status", filter);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(cursor, cursor + limit - 1);

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Fetch related data
    const videoIds = Array.from(new Set((data ?? []).map((r) => r.video_id).filter(Boolean))) as string[];
    const commentIds = Array.from(new Set((data ?? []).map((r) => r.comment_id).filter(Boolean))) as string[];
    const reporterIds = Array.from(new Set((data ?? []).map((r) => r.reporter_id))) as string[];

    const [videosRes, commentsRes, reportersRes] = await Promise.all([
      videoIds.length > 0
        ? supabase.from("videos").select("id, title, thumbnail_url, creator_id").in("id", videoIds)
        : { data: [] },
      commentIds.length > 0
        ? supabase.from("comments").select("id, body, user_id, video_id").in("id", commentIds)
        : { data: [] },
      supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", reporterIds.length > 0 ? reporterIds : ["__none__"]),
    ]);

    const videoMap = new Map((videosRes.data ?? []).map((v: any) => [v.id, v]));
    const commentMap = new Map((commentsRes.data ?? []).map((c: any) => [c.id, c]));
    const reporterMap = new Map((reportersRes.data ?? []).map((r: any) => [r.id, r]));

    const reports = (data ?? []).map((r) => ({
      ...r,
      video: r.video_id ? videoMap.get(r.video_id) ?? null : null,
      comment: r.comment_id ? commentMap.get(r.comment_id) ?? null : null,
      reporter: reporterMap.get(r.reporter_id) ?? null,
    }));

    return NextResponse.json({
      reports,
      hasMore: (data ?? []).length === limit,
      nextCursor: (data ?? []).length === limit ? cursor + limit : null,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/reports — Perform actions on reports
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-reports-action", 10);
    if (rateLimited) return rateLimited;

    const { error, supabase, user } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { action, reportId } = body as {
      action: "review" | "dismiss" | "remove_content";
      reportId: string;
    };

    if (!action || !reportId) {
      return NextResponse.json({ error: "Missing action or reportId" }, { status: 400 });
    }

    // Get the report
    const { data: report, error: reportError } = await supabase
      .from("content_reports")
      .select("id, video_id, comment_id, status")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    switch (action) {
      case "review": {
        await supabase
          .from("content_reports")
          .update({ status: "reviewed", reviewed_at: now, reviewed_by: user.id })
          .eq("id", reportId);
        break;
      }
      case "dismiss": {
        await supabase
          .from("content_reports")
          .update({ status: "dismissed", reviewed_at: now, reviewed_by: user.id })
          .eq("id", reportId);
        break;
      }
      case "remove_content": {
        // Remove the reported content
        if (report.video_id) {
          await supabase
            .from("videos")
            .update({ is_published: false })
            .eq("id", report.video_id);
        }
        if (report.comment_id) {
          await supabase
            .from("comments")
            .delete()
            .eq("id", report.comment_id);
        }

        await supabase
          .from("content_reports")
          .update({ status: "reviewed", reviewed_at: now, reviewed_by: user.id })
          .eq("id", reportId);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
