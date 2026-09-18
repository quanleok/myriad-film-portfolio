import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { createBunnyVideo, getPresignedUploadCredentials } from "@/lib/bunny/upload";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("workshop-upload", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      const title = typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : "Workshop Video";
      const video = await createBunnyVideo(title);
      const credentials = getPresignedUploadCredentials(video.guid);
      const host = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || "vz-4cbb521a-e16.b-cdn.net";

      return NextResponse.json({
        mediaType: "video",
        bunnyVideoId: video.guid,
        uploadUrl: credentials.uploadUrl,
        uploadHeaders: credentials.uploadHeaders,
        playbackUrl: `https://${host}/${video.guid}/play_720p.mp4`,
        thumbnailUrl: `https://${host}/${video.guid}/thumbnail.jpg`,
        maxBytes: MAX_VIDEO_BYTES,
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed for direct upload" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const fileName = `workshop/${user.id}/${Date.now()}.${ext}`;

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from("workshop-media")
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error("[api] workshop media upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("workshop-media").getPublicUrl(fileName);

    return NextResponse.json({
      mediaType: "image",
      url: urlData.publicUrl,
      maxBytes: MAX_IMAGE_BYTES,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
