import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTutorialForEditor } from "@/lib/tutorials";
import { TutorialEditor } from "@/components/tutorials/tutorial-editor";

export const metadata: Metadata = {
  title: "Write Tutorial",
  description: "Write and publish a markdown tutorial thread for the Myriad creator community.",
};

interface TutorialWritePageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function TutorialWritePage({ searchParams }: TutorialWritePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/tutorials/write")}`);
  }

  const initialTutorial =
    typeof params.id === "string" && params.id.trim().length > 0
      ? await fetchTutorialForEditor(supabase, params.id, user.id)
      : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(29,158,117,0.1),rgba(8,14,13,0.96)_30%,rgba(6,10,10,1)_100%)]">
      <TutorialEditor initialTutorial={initialTutorial} />
    </div>
  );
}
