import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LibraryPage } from "@/components/projects/library-page";
import { FF_LIBRARY_ENABLED } from "@/lib/feature-flags";

export const metadata = {
  title: "Library",
};

export default async function ViewerLibraryPage() {
  if (!FF_LIBRARY_ENABLED) {
    redirect("/explore");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/library");
  }

  return <LibraryPage />;
}
