import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTutorialsSchemaCompatError } from "@/lib/tutorials";

async function resolvePublishedTutorial(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tutorialRef: string
) {
  try {
    const { data, error } = await supabase
      .from("tutorials")
      .select("id, like_count, is_published")
      .eq(/^[0-9a-f-]{36}$/i.test(tutorialRef) ? "id" : "slug", tutorialRef)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    if (!isTutorialsSchemaCompatError(error)) {
      throw error;
    }

    const { data, error: legacyError } = await supabase
      .from("tutorials")
      .select("id, published_at")
      .eq(/^[0-9a-f-]{36}$/i.test(tutorialRef) ? "id" : "slug", tutorialRef)
      .maybeSingle();

    if (legacyError) throw legacyError;
    if (!data) return null;

    return {
      id: data.id,
      like_count: 0,
      is_published: Boolean(data.published_at),
    };
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tutorial: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("tutorial-like-toggle", 60);
    if (rateLimited) return rateLimited;

    const { tutorial: tutorialRef } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/tutorials/${tutorialRef}/like`, "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const tutorial = await resolvePublishedTutorial(supabase, tutorialRef);
    if (!tutorial || !tutorial.is_published) {
      return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
    }

    try {
    const { data: existing, error: likeError } = await supabase
      .from("tutorial_likes")
      .select("id")
      .eq("tutorial_id", tutorial.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (likeError) throw likeError;

    const admin = createAdminClient();

    if (existing?.id) {
      const { error: deleteError } = await admin
        .from("tutorial_likes")
        .delete()
        .eq("id", existing.id);

      if (deleteError) throw deleteError;

      const nextCount = Math.max((tutorial.like_count ?? 0) - 1, 0);
      await admin.from("tutorials").update({ like_count: nextCount }).eq("id", tutorial.id);

      return NextResponse.json({ liked: false, like_count: nextCount });
    }

    const { error: insertError } = await admin.from("tutorial_likes").insert({
      tutorial_id: tutorial.id,
      user_id: user.id,
    });

    if (insertError) throw insertError;

    const nextCount = (tutorial.like_count ?? 0) + 1;
    await admin.from("tutorials").update({ like_count: nextCount }).eq("id", tutorial.id);

    return NextResponse.json({ liked: true, like_count: nextCount });
    } catch (error) {
      if (isTutorialsSchemaCompatError(error)) {
        return NextResponse.json(
          { error: "Apply the tutorials forum migration to enable likes." },
          { status: 503 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("[api] tutorial like POST error:", error);
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  }
}
