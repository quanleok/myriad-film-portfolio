import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchTalentDirectoryData } from "@/lib/talent";
import { TalentDirectoryPage } from "@/components/talent/talent-directory-page";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Talent Discovery",
  description:
    "Search AI creators and studios on Myriad Spring by specialty, recent work, and public portfolio.",
  alternates: {
    canonical: "/talent",
  },
};

interface TalentPageProps {
  searchParams: Promise<{
    q?: string;
    specialty?: string;
    availability?: string;
    price?: string;
  }>;
}

export default async function TalentPage({ searchParams }: TalentPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const specialty = (params.specialty ?? "").trim();
  const availability = (params.availability ?? "").trim();
  const price = (params.price ?? "").trim();
  const supabase = await createClient();
  const data = await fetchTalentDirectoryData({
    supabase,
    query,
    specialty,
    availability,
    price,
  });

  return (
    <TalentDirectoryPage
      talents={data.talents}
      allSpecialties={data.allSpecialties}
      query={query}
      specialty={specialty}
      availability={availability}
      price={price}
    />
  );
}
