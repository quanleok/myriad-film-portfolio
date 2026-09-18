import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorOnboardingFlow } from "@/components/creator/onboarding/creator-onboarding-flow";

export const metadata = {
  title: "Creator Onboarding — Myriad",
};

interface OnboardingPageProps {
  searchParams: Promise<{ step?: string; force?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const stepFromQuery = Number(params.step ?? "1");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, is_creator, stripe_onboarding_complete, creator_onboarding_completed, genre_interests"
    )
    .eq("id", user.id)
    .single();

  if (!profileData) {
    redirect("/");
  }

  if (!profileData.is_creator) {
    redirect("/");
  }

  if (profileData.creator_onboarding_completed && params.force !== "1") {
    redirect("/dashboard");
  }

  const initialStep = Number.isFinite(stepFromQuery) ? stepFromQuery : 1;

  return (
    <CreatorOnboardingFlow
      profile={{
        ...profileData,
        email: user.email ?? null,
      }}
      initialStep={initialStep}
    />
  );
}
