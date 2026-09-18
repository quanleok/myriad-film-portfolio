import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { AdminOpportunitiesPage } from "@/components/opportunities/admin-opportunities-page";

export default async function AdminOpportunitiesRoute() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Jobs
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-text-primary">
          Opportunities
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Review paid listings, approve live postings, reject bad submissions,
          or close listings that should leave the public board.
        </p>
      </div>

      <AdminOpportunitiesPage />
    </div>
  );
}
