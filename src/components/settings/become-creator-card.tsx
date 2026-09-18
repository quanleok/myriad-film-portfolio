"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3, DollarSign } from "lucide-react";

export function BecomeCreatorCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleBecomeCreator() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/creators/activate", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to activate creator account");
      }
      router.push("/projects/new");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-text-primary">
          Become a Creator
        </h2>
        <p className="text-sm text-text-secondary">
          Unlock creator tools to launch projects and start earning
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
              <Upload size={18} className="mt-0.5 shrink-0 text-text-tertiary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Upload</p>
                <p className="text-xs text-text-tertiary">
                  Launch AI film projects and earn
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
              <DollarSign size={18} className="mt-0.5 shrink-0 text-text-tertiary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Earn</p>
                <p className="text-xs text-text-tertiary">
                  Earn 80% from preorders and sales
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
              <BarChart3 size={18} className="mt-0.5 shrink-0 text-text-tertiary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Grow</p>
                <p className="text-xs text-text-tertiary">
                  Track analytics and build your audience
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button onClick={handleBecomeCreator} disabled={loading}>
            {loading ? "Activating..." : "Activate Creator Account"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
