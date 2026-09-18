import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileEditForm } from "@/components/creator/profile-edit-form";
import { BlockedCreatorsSection } from "@/components/settings/blocked-creators-section";
import { BecomeCreatorCard } from "@/components/settings/become-creator-card";

export const metadata = { title: "Settings — Myriad" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/settings");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profileData) redirect("/login?redirect=/settings");
  const profile = profileData;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">Edit Profile</h2>
            <p className="text-sm text-text-secondary">@{profile.username}</p>
          </CardHeader>
          <CardContent>
            <ProfileEditForm profile={profile} />
          </CardContent>
        </Card>

        {!profile.is_creator && (
          <BecomeCreatorCard />
        )}

        {profile.is_creator && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary">
                Balance & Payouts
              </h2>
              <p className="text-sm text-text-secondary">
                Manage your earnings and withdrawals from the Creator Dashboard.
              </p>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button variant="secondary">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text-primary">Blocked Creators</h2>
            <p className="text-sm text-text-secondary">
              Blocked creators won&apos;t appear in your feed or recommendations
            </p>
          </CardHeader>
          <CardContent>
            <BlockedCreatorsSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
