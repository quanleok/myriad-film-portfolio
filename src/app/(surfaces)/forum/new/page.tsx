import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForumPostEditor } from "@/components/forum/forum-post-editor";

export default async function NewForumPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/forum/new");
  }

  return <ForumPostEditor />;
}

