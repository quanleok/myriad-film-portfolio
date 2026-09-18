import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTutorialBySlug, fetchTutorialComments } from "@/lib/tutorials";
import { TutorialDetail } from "@/components/tutorials/tutorial-detail";

interface TutorialDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: TutorialDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tutorial = await fetchTutorialBySlug(supabase, slug, user?.id ?? null);

  if (!tutorial) {
    return {
      title: "Tutorial not found",
    };
  }

  return {
    title: tutorial.title,
    description: tutorial.excerpt,
  };
}

export default async function TutorialDetailPage({ params }: TutorialDetailPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tutorial = await fetchTutorialBySlug(supabase, slug, user?.id ?? null);

  if (!tutorial) {
    notFound();
  }

  const comments = await fetchTutorialComments(supabase, tutorial.id);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(29,158,117,0.08),rgba(8,14,13,0.96)_32%,rgba(6,10,10,1)_100%)]">
      <TutorialDetail tutorial={tutorial} comments={comments} />
    </div>
  );
}
