import { createClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;

  return { user, profile };
}
