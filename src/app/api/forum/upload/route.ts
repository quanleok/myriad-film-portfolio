import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";

const ACCEPTED_MIME_PREFIXES = ["image/", "video/"];
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/forum/upload", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a file." }, { status: 400 });
    }

    if (!ACCEPTED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
      return NextResponse.json({ error: "Only image and video uploads are supported." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds the 100MB upload limit." }, { status: 400 });
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "bin" : "bin";
    const storageKey = `forum/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("uploads")
      .upload(storageKey, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[api] forum upload storage error:", uploadError);
      return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("uploads").getPublicUrl(storageKey);

    return NextResponse.json({
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: file.size,
      storage_key: storageKey,
    });
  } catch (error) {
    console.error("[api] forum upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

