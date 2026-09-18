"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/ImageUpload";
import {
  HIRE_AVAILABILITY_LABELS,
  HIRE_AVAILABILITY_OPTIONS,
  HIRE_PRICE_BAND_LABELS,
  HIRE_PRICE_BAND_OPTIONS,
  HIRE_SPECIALTY_OPTIONS,
  type HireAvailability,
  type HirePriceBand,
  type HireSpecialty,
} from "@/lib/talent";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ProfileEditFormProps {
  profile: Profile;
}

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function validateUsername(value: string): string | null {
  if (!value) return "Username is required";
  if (value.length < 3) return "At least 3 characters";
  if (value.length > 20) return "Maximum 20 characters";
  if (value !== value.toLowerCase()) return "Lowercase only";
  if (/\s/.test(value)) return "No spaces allowed";
  if (!USERNAME_REGEX.test(value)) return "Only lowercase letters, numbers, and underscores";
  return null;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? "");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    (profile.social_links as Record<string, string>) ?? {}
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [hireSpecialties, setHireSpecialties] = useState<HireSpecialty[]>(
    Array.isArray(profile.hire_specialties)
      ? profile.hire_specialties.filter((value): value is HireSpecialty =>
          (HIRE_SPECIALTY_OPTIONS as readonly string[]).includes(value)
        )
      : []
  );
  const [hireAvailability, setHireAvailability] = useState<HireAvailability | "">(
    profile.hire_availability &&
      (HIRE_AVAILABILITY_OPTIONS as readonly string[]).includes(profile.hire_availability)
      ? (profile.hire_availability as HireAvailability)
      : ""
  );
  const [hirePriceBand, setHirePriceBand] = useState<HirePriceBand | "">(
    profile.hire_price_band &&
      (HIRE_PRICE_BAND_OPTIONS as readonly string[]).includes(profile.hire_price_band)
      ? (profile.hire_price_band as HirePriceBand)
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAvatarUpdate(url: string) {
    setAvatarUrl(url);
  }

  function handleUsernameChange(value: string) {
    const cleaned = value.toLowerCase().replace(/\s/g, "");
    setUsername(cleaned);

    // Clear any pending uniqueness check
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);

    const validationErr = validateUsername(cleaned);
    if (validationErr) {
      setUsernameError(validationErr);
      setCheckingUsername(false);
      return;
    }

    // Skip uniqueness check if unchanged
    if (cleaned === profile.username) {
      setUsernameError(null);
      setCheckingUsername(false);
      return;
    }

    // Debounced uniqueness check
    setCheckingUsername(true);
    setUsernameError(null);

    usernameTimerRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleaned)
        .neq("id", profile.id)
        .maybeSingle();

      setCheckingUsername(false);
      if (data) {
        setUsernameError("Username is already taken");
      }
    }, 400);
  }

  function updateSocialLink(key: string, value: string) {
    setSocialLinks((prev) => {
      if (!value.trim()) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }

  function toggleSpecialty(specialty: HireSpecialty) {
    setHireSpecialties((current) =>
      current.includes(specialty)
        ? current.filter((value) => value !== specialty)
        : [...current, specialty]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate username before submitting
    const usernameValidation = validateUsername(username);
    if (usernameValidation) {
      setUsernameError(usernameValidation);
      return;
    }
    if (usernameError || checkingUsername) return;

    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username,
        bio: bio || null,
        website_url: websiteUrl || null,
        social_links: socialLinks,
        avatar_url: avatarUrl || null,
        hire_specialties: hireSpecialties,
        hire_availability: hireAvailability || null,
        hire_price_band: hirePriceBand || null,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      if (error.message?.includes("unique") || error.code === "23505") {
        setUsernameError("Username is already taken");
      } else {
        showToast("Failed to save profile");
      }
    } else {
      showToast("Saved");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="rounded-lg bg-surface border border-border px-4 py-3 text-sm text-text-secondary">
          {toast}
        </div>
      )}

      {/* Avatar */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          Avatar
        </label>
        <ImageUpload
          bucket="avatars"
          currentUrl={avatarUrl || null}
          onUpload={(url) => handleAvatarUpdate(url)}
          aspectRatio="square"
          maxSizeMB={2}
        />
      </div>

      {/* Display Name */}
      <Input
        id="display_name"
        label="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={50}
        required
      />

      {/* Username */}
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm font-medium text-text-primary">
          Username
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary select-none">
            @
          </span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            maxLength={20}
            className={`flex h-10 w-full rounded-lg border bg-surface pl-7 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-150 focus:outline-none focus:ring-2 focus:border-transparent focus:bg-surface-hover disabled:opacity-50 ${
              usernameError
                ? "border-red-500 focus:ring-red-500"
                : "border-border focus:ring-text-primary"
            }`}
            placeholder="your_username"
          />
          {checkingUsername && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
              checking...
            </span>
          )}
        </div>
        {usernameError && (
          <p className="text-sm text-red-600 dark:text-red-400">{usernameError}</p>
        )}
        <p className="text-xs text-text-tertiary">
          3–20 characters. Lowercase letters, numbers, and underscores only.
        </p>
      </div>

      {/* Bio */}
      <Textarea
        id="bio"
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Tell viewers about yourself..."
        rows={4}
        maxLength={500}
      />

      {/* Website */}
      <Input
        id="website_url"
        label="Website URL"
        type="url"
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
        placeholder="https://example.com"
      />

      {/* Social Links */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-text-secondary">
          Social Links
        </label>
        {["twitter", "youtube", "tiktok", "discord"].map((platform) => (
          <Input
            key={platform}
            id={`social_${platform}`}
            label={platform.charAt(0).toUpperCase() + platform.slice(1)}
            value={socialLinks[platform] ?? ""}
            onChange={(e) => updateSocialLink(platform, e.target.value)}
            placeholder={`Your ${platform} URL`}
          />
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
        <div>
          <p className="text-sm font-medium text-text-primary">Hiring profile</p>
          <p className="mt-1 text-xs text-text-tertiary">
            These fields power Jobs and Talent filters.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Specialties
          </label>
          <div className="flex flex-wrap gap-2">
            {HIRE_SPECIALTY_OPTIONS.map((specialty) => {
              const active = hireSpecialties.includes(specialty);
              return (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => toggleSpecialty(specialty)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-600 text-white"
                      : "bg-page text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  {specialty}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="hire_availability"
              className="block text-sm font-medium text-text-secondary"
            >
              Availability
            </label>
            <select
              id="hire_availability"
              value={hireAvailability}
              onChange={(e) =>
                setHireAvailability((e.target.value || "") as HireAvailability | "")
              }
              className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-all duration-150 focus:border-transparent focus:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-text-primary"
            >
              <option value="">Not set</option>
              {HIRE_AVAILABILITY_OPTIONS.map((availability) => (
                <option
                  key={availability}
                  value={availability}
                  className="bg-surface text-text-primary"
                >
                  {HIRE_AVAILABILITY_LABELS[availability]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="hire_price_band"
              className="block text-sm font-medium text-text-secondary"
            >
              Price band
            </label>
            <select
              id="hire_price_band"
              value={hirePriceBand}
              onChange={(e) =>
                setHirePriceBand((e.target.value || "") as HirePriceBand | "")
              }
              className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-all duration-150 focus:border-transparent focus:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-text-primary"
            >
              <option value="">Not set</option>
              {HIRE_PRICE_BAND_OPTIONS.map((priceBand) => (
                <option
                  key={priceBand}
                  value={priceBand}
                  className="bg-surface text-text-primary"
                >
                  {HIRE_PRICE_BAND_LABELS[priceBand]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-page pt-4 pb-2 -mx-1 px-1 border-t border-border">
        <Button type="submit" disabled={saving || !displayName.trim() || !!usernameError || checkingUsername}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
