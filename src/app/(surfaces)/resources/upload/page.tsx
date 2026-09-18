import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResourceUploadForm } from "@/components/resources/resource-upload-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Upload Resource",
  description: "Upload reusable packs, prompt templates, style presets, and workflow guides to the Resources library.",
  alternates: {
    canonical: "/resources/upload",
  },
};

export default async function ResourceUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/resources/upload");
  }

  return <ResourceUploadForm />;
}
