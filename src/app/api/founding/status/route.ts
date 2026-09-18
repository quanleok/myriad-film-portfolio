import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFoundingProgramStatus } from "@/lib/founding-program-server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const rateLimited = await checkRateLimit("founding-status", 120);
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const status = await getFoundingProgramStatus(user?.id ?? null);

  return NextResponse.json(status);
}
