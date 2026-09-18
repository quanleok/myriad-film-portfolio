import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const rateLimited = await checkRateLimit("character-sheet-upload", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/toolkit/character-sheet/upload", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const storageKey = `toolkit/character-sheet/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const admin = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from("workshop-media")
      .upload(storageKey, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[api] character-sheet upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("workshop-media").getPublicUrl(storageKey);

    return NextResponse.json({
      url: publicUrl,
      storageKey,
      maxBytes: MAX_IMAGE_BYTES,
    });
  } catch (error) {
    console.error("[api] character-sheet upload route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
