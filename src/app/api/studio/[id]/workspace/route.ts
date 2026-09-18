import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStudioBeats,
  getStudioEntities,
  getStudioProject,
  getStudioScenes,
  getStudioScript,
  getStudioStoryCore,
} from "@/lib/studio/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const [projectResult, storyCoreResult, entitiesResult, beatsResult, scenesResult, scriptResult] =
      await Promise.allSettled([
        getStudioProject(admin, id),
        getStudioStoryCore(admin, id),
        getStudioEntities(admin, id),
        getStudioBeats(admin, id),
        getStudioScenes(admin, id),
        getStudioScript(admin, id),
      ]);

    if (projectResult.status !== "fulfilled") {
      throw projectResult.reason;
    }

    return NextResponse.json({
      workspace: {
        project: projectResult.value,
        storyCore:
          storyCoreResult.status === "fulfilled" ? storyCoreResult.value : null,
        entities:
          entitiesResult.status === "fulfilled" ? entitiesResult.value : [],
        beats: beatsResult.status === "fulfilled" ? beatsResult.value : [],
        scenes: scenesResult.status === "fulfilled" ? scenesResult.value : [],
        script: scriptResult.status === "fulfilled" ? scriptResult.value : null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Studio workspace";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
