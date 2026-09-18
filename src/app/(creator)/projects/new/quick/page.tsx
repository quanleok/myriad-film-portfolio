import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuickReleaseComposer } from "@/components/projects/quick-release-composer";
import { FF_PROJECT_COMPOSER_ENABLED } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Quick Release",
};

export default async function QuickReleasePage() {
  if (!FF_PROJECT_COMPOSER_ENABLED) {
    redirect("/upload");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/projects/new/quick");
  }

  return <QuickReleaseComposer />;
}
