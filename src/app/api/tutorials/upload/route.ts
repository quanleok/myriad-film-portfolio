import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import { createBunnyVideo, getPresignedUploadCredentials } from "@/lib/bunny/upload";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("tutorial-upload", 24);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/tutorials/upload", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as
        | { title?: string; mediaType?: string }
        | null;

      if (body?.mediaType !== "video") {
        return NextResponse.json({ error: "Unsupported media type" }, { status: 400 });
      }

      const title =
        typeof body.title === "string" && body.title.trim().length > 0
          ? body.title.trim()
          : "Tutorial video";

      const video = await createBunnyVideo(title);
      const credentials = getPresignedUploadCredentials(video.guid);
      const host =
        process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || "vz-4cbb521a-e16.b-cdn.net";

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
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported here" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const storageKey = `tutorials/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const admin = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from("workshop-media")
      .upload(storageKey, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[api] tutorials upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("workshop-media").getPublicUrl(storageKey);

    return NextResponse.json({
      mediaType: "image",
      url: publicUrl,
      storageKey,
      maxBytes: MAX_IMAGE_BYTES,
    });
  } catch (error) {
    console.error("[api] tutorial upload route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
