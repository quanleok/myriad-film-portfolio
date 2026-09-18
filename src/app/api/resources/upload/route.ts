import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const ALLOWED_PREFIXES = ["image/", "audio/"];
const ALLOWED_EXTENSIONS = new Set(["txt", "md", "json", "zip", "pdf", "wav", "ogg", "mp3", "png", "jpg", "jpeg", "webp"]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/resources/upload", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large (max 50MB)." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const extensionAllowed = ALLOWED_EXTENSIONS.has(ext);
    const mimeAllowed = ALLOWED_PREFIXES.some((prefix) => file.type.startsWith(prefix));

    if (!extensionAllowed && !mimeAllowed) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    const storageKey = `resources/${user.id}/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "-")}`;
    const admin = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await admin.storage
      .from("workshop-media")
      .upload(storageKey, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.error("[api] resource upload error:", error);
      return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("workshop-media").getPublicUrl(storageKey);

    return NextResponse.json({
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type || ext || null,
      file_size_bytes: file.size,
      storage_key: storageKey,
    });
  } catch (error) {
    console.error("[api] resources upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
