import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectComposer } from "@/components/projects/project-composer";
import { LaunchModePicker } from "@/components/projects/launch-mode-picker";
import { FF_PROJECT_COMPOSER_ENABLED } from "@/lib/feature-flags";

export const metadata = {
  title: "Create Project",
};

interface NewProjectPageProps {
  searchParams: Promise<{ edit?: string; mode?: string }>;
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  if (!FF_PROJECT_COMPOSER_ENABLED) {
    redirect("/upload");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const editProjectId = params.edit?.trim();

  // If editing an existing project, go straight to the full composer
  if (editProjectId) {
    return <ProjectComposer editProjectId={editProjectId} />;
  }

  // If mode specified, go straight to composer with that launch mode
  if (params.mode === "teaser" || params.mode === "preorder" || params.mode === "production") {
    return (
      <ProjectComposer
        editProjectId={null}
        initialLaunchMode={params.mode}
      />
    );
  }

  // Show launch mode picker
  return <LaunchModePicker />;
}
