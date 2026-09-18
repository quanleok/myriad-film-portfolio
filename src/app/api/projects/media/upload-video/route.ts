import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createBunnyVideo,
  getPresignedUploadCredentials,
} from "@/lib/bunny/upload";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("project-media-upload", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_creator")
      .eq("id", user.id)
      .single();

    if (!profile?.is_creator) {
      return NextResponse.json(
        { error: "Creator access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const title = body.title;

    if (!title || typeof title !== "string" || title.length > 200) {
      return NextResponse.json(
        { error: "Title is required (max 200 chars)" },
        { status: 400 }
      );
    }

    const bunnyVideo = await createBunnyVideo(title.trim());
    const { uploadUrl, uploadHeaders } = getPresignedUploadCredentials(
      bunnyVideo.guid
    );

    return NextResponse.json({
      bunnyVideoId: bunnyVideo.guid,
      uploadUrl,
      uploadHeaders,
    });
  } catch (err) {
    console.error("[api] project media upload error:", err);
    return NextResponse.json(
      { error: "Upload initiation failed" },
      { status: 500 }
    );
  }
}
