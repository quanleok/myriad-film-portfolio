import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTutorialsSchemaCompatError } from "@/lib/tutorials";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tutorial: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("tutorial-view", 180);
    if (rateLimited) return rateLimited;

    const { tutorial: tutorialRef } = await params;
    const supabase = await createClient();
    try {
      const { data: tutorial, error } = await supabase
        .from("tutorials")
        .select("id, view_count, is_published")
        .eq(/^[0-9a-f-]{36}$/i.test(tutorialRef) ? "id" : "slug", tutorialRef)
        .maybeSingle();

      if (error) throw error;
      if (!tutorial || !tutorial.is_published) {
        return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
      }

      const nextCount = (tutorial.view_count ?? 0) + 1;
      const admin = createAdminClient();
      await admin.from("tutorials").update({ view_count: nextCount }).eq("id", tutorial.id);

      return NextResponse.json({ view_count: nextCount });
    } catch (error) {
      if (!isTutorialsSchemaCompatError(error)) {
        throw error;
      }

      const { data: legacyTutorial, error: legacyError } = await supabase
        .from("tutorials")
        .select("id, published_at")
        .eq(/^[0-9a-f-]{36}$/i.test(tutorialRef) ? "id" : "slug", tutorialRef)
        .maybeSingle();

      if (legacyError) throw legacyError;
      if (!legacyTutorial || !legacyTutorial.published_at) {
        return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
      }

      return NextResponse.json({ view_count: 0 });
    }
  } catch (error) {
    console.error("[api] tutorial view POST error:", error);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
