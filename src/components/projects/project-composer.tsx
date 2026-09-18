"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFoundingProgramStatus } from "@/hooks/use-founding-program-status";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FoundingProgramPanel } from "@/components/founding/founding-program-panel";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VideoUpload } from "@/components/ui/VideoUpload";
import {
  CAMPAIGN_DURATION_MIN,
  CAMPAIGN_DURATION_MAX,
  CAMPAIGN_FEE_MAX_CENTS,
  PRODUCTION_WINDOW_MIN,
  PRODUCTION_WINDOW_MAX,
  PRODUCTION_FEE_MAX_CENTS,
  FEES_WAIVED,
  calculateDurationFee,
  CONTENT_RATING_LABELS,
  CONTENT_RATINGS,
  PREORDER_PRICE_MAX,
  PREORDER_PRICE_MIN,
  RELEASE_PRICE_MIN,
  RELEASE_PRICE_MAX,
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMATS,
  PROJECT_GENRE_LABELS,
  PROJECT_GENRES,
  PROJECT_TONE_LABELS,
  PROJECT_TONES,
  UNLOCK_TARGET_MAX,
  UNLOCK_TARGET_MIN,
  EPISODE_COUNT_MIN,
  EPISODE_COUNT_MAX,
} from "@/types/project";
import { PLATFORM_FEE_RATE, type ProjectLaunchMode } from "@/types/project";
import type { FoundingProgramStatus } from "@/lib/founding-program";
import { formatPrice, slugify } from "@/lib/utils";
import { getLaunchReadiness } from "@/lib/project-launch-readiness";
import { getProjectTeaserThumbnailUrl } from "./utils";

type SaveState = "idle" | "saving" | "saved" | "error";

interface CharacterCardDraft {
  id?: string;
  name: string;
  short_description: string;
  media_asset_id: string;
  video_asset_id: string;
  media_type: "image" | "video";
  sort_order: number;
}

interface ConceptCardDraft {
  id?: string;
  caption: string;
  media_asset_id: string;
  video_asset_id: string;
  media_type: "image" | "video";
  sort_order: number;
}

interface ProjectComposerProps {
  editProjectId?: string | null;
  initialLaunchMode?: ProjectLaunchMode;
  foundingProgram?: FoundingProgramStatus | null;
}

function defaultCharacter(index: number): CharacterCardDraft {
  return {
    name: "",
    short_description: "",
    media_asset_id: "",
    video_asset_id: "",
    media_type: "image",
    sort_order: index,
  };
}

function defaultConcept(index: number): ConceptCardDraft {
  return {
    caption: "",
    media_asset_id: "",
    video_asset_id: "",
    media_type: "image",
    sort_order: index,
  };
}

function SaveIndicator({ state, isLive }: { state: SaveState; isLive?: boolean }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
        <Loader2 size={12} className="animate-spin" /> Saving...
      </span>
    );
  }

  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-role-success-fg">
        <Check size={12} /> Saved
      </span>
    );
  }

  if (state === "error") {
    return <span className="text-xs text-role-danger-fg">Not saved</span>;
  }

  return <span className="text-xs text-text-tertiary">{isLive ? "Edit mode" : "Draft mode"}</span>;
}

const COMPOSER_LAUNCH_MODE_OPTIONS: Array<{
  value: ProjectLaunchMode;
  title: string;
  description: string;
}> = [
  {
    value: "preorder",
    title: "Seed Campaign",
    description: "Viewers unlock the project by hitting a preorder target before production starts.",
  },
  {
    value: "production",
    title: "Direct to Production",
    description: "Commit to making the film from day one. Preorders stay open while you produce it.",
  },
];

export function ProjectComposer({
  editProjectId = null,
  initialLaunchMode,
  foundingProgram = null,
}: ProjectComposerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const { status: foundingProgramStatus } = useFoundingProgramStatus(foundingProgram);

  const [projectId, setProjectId] = useState<string | null>(editProjectId ?? null);
  const [loadingProject, setLoadingProject] = useState(Boolean(editProjectId));
  const [initialized, setInitialized] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [slug, setSlug] = useState("");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [tone, setTone] = useState("");
  const [contentRating, setContentRating] = useState("");
  const [runtimeMinutes, setRuntimeMinutes] = useState(90);

  const [teaserAssetId, setTeaserAssetId] = useState("");
  const [teaserThumbnailUrl, setTeaserThumbnailUrl] = useState("");

  const [characters, setCharacters] = useState<CharacterCardDraft[]>([
    defaultCharacter(0),
  ]);

  const [concepts, setConcepts] = useState<ConceptCardDraft[]>([
    defaultConcept(0),
  ]);

  const [synopsis, setSynopsis] = useState("");
  const [inspirationLine, setInspirationLine] = useState("");

  const [launchMode, setLaunchMode] = useState<ProjectLaunchMode>(initialLaunchMode ?? "teaser");
  const [preorderPriceCents, setPreorderPriceCents] = useState(500);
  const [unlockTarget, setUnlockTarget] = useState(300);
  const [campaignDurationDays, setCampaignDurationDays] = useState(21);
  const [productionWindowDays, setProductionWindowDays] = useState(60);
  const [releasePriceCents, setReleasePriceCents] = useState(0);
  const [releasePriceTouched, setReleasePriceTouched] = useState(false);
  const [episodeCount, setEpisodeCount] = useState<number | null>(null);

  const [rightsAttested, setRightsAttested] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<string>("private_draft");
  const [lifecycleStatus, setLifecycleStatus] = useState<string>("draft");
  const [communityPostId, setCommunityPostId] = useState<string | null>(null);
  const [communityBanner, setCommunityBanner] = useState(false);

  // Track which fields have been touched (for blur-based validation)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSections = 7;

  const completeCharacterCards = characters.filter(
    (card) => card.name.trim() && card.short_description.trim() && (card.media_asset_id.trim() || card.video_asset_id.trim())
  ).length;

  const completeConceptCards = concepts.filter(
    (card) => card.caption.trim() && (card.media_asset_id.trim() || card.video_asset_id.trim())
  ).length;

  const isTeaserLaunch = launchMode === "teaser";
  const isProductionLaunch = launchMode === "production";
  const isPreorderLaunch = launchMode === "preorder";
  const supportsPreorderFlow = isPreorderLaunch || isProductionLaunch;
  const launchActionLabel = isTeaserLaunch ? "Post Teaser" : isProductionLaunch ? "Launch Project" : "Launch Campaign";
  const resolvedTeaserThumbnailUrl =
    getProjectTeaserThumbnailUrl(teaserThumbnailUrl.trim() || null, teaserAssetId.trim() || null) ?? "";
  const launchReadiness = useMemo(
    () =>
      getLaunchReadiness(
        {
          launchMode,
          title,
          hook,
          synopsis,
          genre,
          contentRating,
          teaserAssetId,
          preorderPriceCents,
          unlockTarget,
          campaignDurationDays,
          productionWindowDays,
          releasePriceCents,
          episodeCount,
          format,
          rightsReady: rightsAttested,
          termsReady: termsAccepted,
        },
        { includeCompliance: true }
      ),
    [
      campaignDurationDays,
      contentRating,
      episodeCount,
      format,
      genre,
      hook,
      launchMode,
      preorderPriceCents,
      productionWindowDays,
      releasePriceCents,
      rightsAttested,
      synopsis,
      teaserAssetId,
      termsAccepted,
      title,
      unlockTarget,
    ]
  );

  const sectionCompletion = useMemo(() => {
    const section1 =
      title.trim().length >= 3 &&
      hook.trim().length >= 10 &&
      Boolean(genre) &&
      Boolean(contentRating);

    const section2 = Boolean(teaserAssetId);
    const section3 = completeCharacterCards >= 1;
    const section4 = completeConceptCards >= 1;
    const section5 = isTeaserLaunch
      ? Boolean(synopsis.trim() || inspirationLine.trim())
      : synopsis.trim().length >= 50;

    const section6 =
      isTeaserLaunch ||
      (
        supportsPreorderFlow &&
        preorderPriceCents >= PREORDER_PRICE_MIN &&
        preorderPriceCents <= PREORDER_PRICE_MAX &&
        productionWindowDays >= PRODUCTION_WINDOW_MIN && productionWindowDays <= PRODUCTION_WINDOW_MAX &&
        releasePriceCents >= RELEASE_PRICE_MIN &&
        releasePriceCents <= RELEASE_PRICE_MAX &&
        releasePriceCents >= preorderPriceCents &&
        (!isPreorderLaunch || (
          unlockTarget >= UNLOCK_TARGET_MIN &&
          unlockTarget <= UNLOCK_TARGET_MAX &&
          campaignDurationDays >= CAMPAIGN_DURATION_MIN && campaignDurationDays <= CAMPAIGN_DURATION_MAX
        )) &&
        (format !== "series" || (episodeCount !== null && episodeCount >= EPISODE_COUNT_MIN && episodeCount <= EPISODE_COUNT_MAX))
      );

    const section7 = rightsAttested && termsAccepted;

    return [section1, section2, section3, section4, section5, section6, section7];
  }, [
    campaignDurationDays,
    completeCharacterCards,
    completeConceptCards,
    contentRating,
    episodeCount,
    format,
    genre,
    hook,
    inspirationLine,
    isPreorderLaunch,
    preorderPriceCents,
    productionWindowDays,
    releasePriceCents,
    rightsAttested,
    synopsis,
    teaserAssetId,
    termsAccepted,
    title,
    unlockTarget,
    isTeaserLaunch,
    supportsPreorderFlow,
  ]);

  const completionCount = sectionCompletion.filter(Boolean).length;
  const launchChecklist = launchReadiness.checklist.map((item) => ({
    label: item.label[0].toUpperCase() + item.label.slice(1),
    ready: item.ready,
  }));
  const launchReadyCount = launchChecklist.filter((item) => item.ready).length;
  const submitRequirementsMet = launchReadiness.ready;

  const preloadProject = useCallback(async () => {
    if (!editProjectId) {
      setInitialized(true);
      setLoadingProject(false);
      return;
    }

    setLoadingProject(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/projects/${editProjectId}`);
      const payload = await response.json();

      if (!response.ok || !payload.project) {
        throw new Error(payload.error ?? "Failed to load project");
      }

      const project = payload.project as Record<string, unknown>;

      setProjectId(String(project.id));
      setModerationStatus(String(project.moderation_status ?? "private_draft"));
      setLifecycleStatus(String(project.lifecycle_status ?? "draft"));
      setTitle(String(project.title ?? ""));
      setHook(String(project.hook ?? ""));
      setSlug(String(project.slug ?? ""));
      if (project.slug) setSlugTouched(true);
      setGenre(String(project.genre ?? ""));
      setFormat(String(project.format ?? ""));
      setTone(String(project.tone ?? ""));
      setContentRating(String(project.content_rating ?? ""));
      setRuntimeMinutes(Number(project.runtime_minutes ?? 90));
      const loadedTeaserAssetId = String(project.teaser_asset_id ?? "");
      const loadedTeaserThumbnailUrl =
        getProjectTeaserThumbnailUrl(
          String(project.teaser_thumbnail_url ?? "") || null,
          loadedTeaserAssetId || null
        ) ?? "";
      setTeaserAssetId(loadedTeaserAssetId);
      setTeaserThumbnailUrl(loadedTeaserThumbnailUrl);
      setSynopsis(String(project.synopsis ?? ""));
      setInspirationLine(String(project.inspiration_line ?? ""));
      setLaunchMode((project.launch_mode as ProjectLaunchMode) ?? "preorder");
      setPreorderPriceCents(Number(project.preorder_price_cents ?? 500));
      setUnlockTarget(Number(project.unlock_target ?? 300));
      setCampaignDurationDays(Number(project.campaign_duration_days ?? 21));
      setProductionWindowDays(Number(project.production_window_days ?? 60));
      const loadedReleasePrice = Number(project.release_price_cents ?? 0);
      setReleasePriceCents(loadedReleasePrice);
      if (loadedReleasePrice > 0) setReleasePriceTouched(true);
      setEpisodeCount((project as Record<string, unknown>).episode_count as number | null ?? null);

      const loadedCharacters = (payload.characters as CharacterCardDraft[] | undefined) ?? [];
      const loadedConcepts = (payload.concepts as ConceptCardDraft[] | undefined) ?? [];

      setCharacters(
        loadedCharacters.length > 0
          ? loadedCharacters.map((card, idx) => ({
              id: card.id,
              name: card.name ?? "",
              short_description: card.short_description ?? "",
              media_asset_id: card.media_asset_id ?? "",
              video_asset_id: (card as unknown as Record<string, unknown>).video_asset_id as string ?? "",
              media_type: card.media_type === "video" ? "video" : "image",
              sort_order: idx,
            }))
          : [defaultCharacter(0)]
      );

      setConcepts(
        loadedConcepts.length > 0
          ? loadedConcepts.map((card, idx) => ({
              id: card.id,
              caption: card.caption ?? "",
              media_asset_id: card.media_asset_id ?? "",
              video_asset_id: (card as unknown as Record<string, unknown>).video_asset_id as string ?? "",
              media_type: card.media_type === "video" ? "video" : "image",
              sort_order: idx,
            }))
          : [defaultConcept(0)]
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoadingProject(false);
      setInitialized(true);
    }
  }, [editProjectId]);

  useEffect(() => {
    void preloadProject();
  }, [preloadProject]);

  // Community post → project pre-fill
  useEffect(() => {
    const fromCommunity = searchParams.get("from_community");
    if (!fromCommunity || editProjectId) return;

    const fetchPrefill = async () => {
      try {
        const res = await fetch(`/api/community/${fromCommunity}/convert`, { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        const pf = data.prefill;
        if (!pf) return;

        setCommunityPostId(pf.community_post_id);
        setCommunityBanner(true);
        if (pf.title) setTitle(pf.title);
        if (pf.bunny_video_id) {
          setTeaserAssetId(pf.bunny_video_id);
          setTeaserThumbnailUrl(
            pf.thumbnail_url || getProjectTeaserThumbnailUrl(null, pf.bunny_video_id) || ""
          );
        } else if (pf.thumbnail_url) {
          setTeaserThumbnailUrl(pf.thumbnail_url);
        }
        if (pf.genre) setGenre(pf.genre);
      } catch {
        // ignore — user can still fill manually
      }
    };

    fetchPrefill();
  }, [searchParams, editProjectId]);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(title).slice(0, 60));
  }, [slugTouched, title]);

  // Auto-set release price to match preorder price if user hasn't touched it
  useEffect(() => {
    if (releasePriceTouched) return;
    if (preorderPriceCents >= PREORDER_PRICE_MIN) {
      setReleasePriceCents(preorderPriceCents);
    }
  }, [preorderPriceCents, releasePriceTouched]);

  useEffect(() => {
    if (!initialized) return;

    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);

    if (!slug || slug.length < 3) {
      setSlugState("idle");
      return;
    }

    slugTimerRef.current = setTimeout(async () => {
      setSlugState("checking");

      try {
        const params = new URLSearchParams({ slug });
        if (projectId) params.set("exclude", projectId);

        const response = await fetch(`/api/projects/check-slug?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          setSlugState("idle");
          return;
        }

        setSlugState(payload.available ? "available" : "taken");
      } catch {
        setSlugState("idle");
      }
    }, 500);

    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    };
  }, [initialized, projectId, slug]);

  const saveProject = useCallback(async () => {
    if (!initialized) return;
    if (!title.trim() || title.trim().length < 3) return;

    setSaveState("saving");
    setSaveError(null);

    const payload = {
      title: title.trim(),
      hook: hook.trim(),
      slug: slug.trim(),
      launch_mode: launchMode,
      genre: genre || null,
      format: format || null,
      tone: tone || null,
      content_rating: contentRating || null,
      runtime_minutes: Number(runtimeMinutes) || null,
      teaser_asset_id: teaserAssetId.trim() || null,
      teaser_thumbnail_url: resolvedTeaserThumbnailUrl || null,
      synopsis: synopsis.trim() || null,
      inspiration_line: inspirationLine.trim() || null,
      preorder_price_cents: supportsPreorderFlow ? (Number(preorderPriceCents) || null) : null,
      unlock_target: isPreorderLaunch ? (Number(unlockTarget) || null) : null,
      campaign_duration_days: isPreorderLaunch ? Number(campaignDurationDays) : null,
      production_window_days: supportsPreorderFlow ? Number(productionWindowDays) : null,
      release_price_cents: isTeaserLaunch ? null : Number(releasePriceCents) || null,
      episode_count: format === "series" ? (Number(episodeCount) || null) : null,
    };

    // Strip locked fields for non-draft projects
    const sendPayload = lifecycleStatus !== "draft"
      ? Object.fromEntries(
          Object.entries(payload).filter(
            ([key]) => !["launch_mode", "preorder_price_cents", "unlock_target", "campaign_duration_days", "production_window_days", "episode_count"].includes(key)
          )
        )
      : payload;

    try {
      if (!projectId) {
        const createResponse = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sendPayload),
        });

        const createPayload = await createResponse.json();

        if (!createResponse.ok || !createPayload.project?.id) {
          throw new Error(createPayload.error ?? "Failed to create draft");
        }

        const newProjectId = String(createPayload.project.id);
        setProjectId(newProjectId);

        // Link community post to this project (fire-and-forget)
        if (communityPostId) {
          fetch(`/api/community/${communityPostId}/convert`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: newProjectId }),
          }).catch(() => {});
          setCommunityBanner(false);
        }
      } else {
        const patchResponse = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sendPayload),
        });

        const patchPayload = await patchResponse.json();

        if (!patchResponse.ok) {
          throw new Error(patchPayload.error ?? "Failed to save project");
        }
      }

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save project");
    }
  }, [
    campaignDurationDays,
    communityPostId,
    contentRating,
    format,
    genre,
    hook,
    initialized,
    inspirationLine,
    isPreorderLaunch,
    lifecycleStatus,
    isTeaserLaunch,
    launchMode,
    preorderPriceCents,
    productionWindowDays,
    projectId,
    releasePriceCents,
    runtimeMinutes,
    slug,
    synopsis,
    teaserAssetId,
    resolvedTeaserThumbnailUrl,
    title,
    tone,
    unlockTarget,
    supportsPreorderFlow,
  ]);

  const saveCards = useCallback(async () => {
    if (!projectId) return;

    try {
      await Promise.all([
        fetch(`/api/projects/${projectId}/characters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cards: characters.map((card, index) => ({
              id: card.id,
              name: card.name.trim(),
              short_description: card.short_description.trim() || null,
              media_asset_id: card.media_asset_id.trim() || null,
              video_asset_id: card.video_asset_id.trim() || null,
              media_type: card.video_asset_id.trim() && !card.media_asset_id.trim() ? "video" : "image",
              sort_order: index,
            })),
          }),
        }),
        fetch(`/api/projects/${projectId}/concepts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cards: concepts.map((card, index) => ({
              id: card.id,
              caption: card.caption.trim() || null,
              media_asset_id: card.media_asset_id.trim() || null,
              video_asset_id: card.video_asset_id.trim() || null,
              media_type: card.video_asset_id.trim() && !card.media_asset_id.trim() ? "video" : "image",
              sort_order: index,
            })),
          }),
        }),
      ]);
    } catch {
      // Keep autosave resilient, do not hard-fail full form.
    }
  }, [characters, concepts, projectId]);

  useEffect(() => {
    if (!initialized) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void saveProject();
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    campaignDurationDays,
    contentRating,
    format,
    genre,
    hook,
    initialized,
    inspirationLine,
    launchMode,
    episodeCount,
    preorderPriceCents,
    productionWindowDays,
    releasePriceCents,
    runtimeMinutes,
    saveProject,
    slug,
    synopsis,
    teaserAssetId,
    teaserThumbnailUrl,
    title,
    tone,
    unlockTarget,
  ]);

  useEffect(() => {
    if (!initialized || !projectId) return;

    if (cardsTimerRef.current) clearTimeout(cardsTimerRef.current);
    cardsTimerRef.current = setTimeout(() => {
      void saveCards();
    }, 1200);

    return () => {
      if (cardsTimerRef.current) clearTimeout(cardsTimerRef.current);
    };
  }, [characters, concepts, initialized, projectId, saveCards]);

  const confirmSubmit = useCallback(async () => {
    if (!projectId || submitting) return;

    setSubmitError(null);
    setSubmitSuccess(null);
    setShowSubmitModal(false);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rights_attested: rightsAttested,
          terms_version: termsAccepted ? "v1.0" : null,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        foundingAwarded?: boolean;
        foundingAlreadyActive?: boolean;
        slotNumber?: number | null;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Submit failed");
      }

      setSubmitSuccess(
        isTeaserLaunch
          ? "Your teaser is live. It now appears as a normal project page and can be converted later."
          : isProductionLaunch
          ? "Your project is live and in production. Share it to start collecting preorders."
          : "Your campaign is live! Share your project to start collecting preorders."
      );
      if (isTeaserLaunch) {
        const params = new URLSearchParams();
        params.set("launch", "teaser");
        if (payload.foundingAwarded) {
          params.set("founding_awarded", "1");
          if (typeof payload.slotNumber === "number") {
            params.set("founding_slot", String(payload.slotNumber));
          }
        } else if (payload.foundingAlreadyActive) {
          params.set("founding_existing", "1");
        }
        router.push(`/dashboard?${params.toString()}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [isProductionLaunch, isTeaserLaunch, projectId, rightsAttested, router, submitting, termsAccepted]);

  const confirmDelete = useCallback(async () => {
    if (!projectId || deleting) return;
    setDeleting(true);
    setShowDeleteModal(false);

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Delete failed");
      }
      router.push("/dashboard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }, [deleting, projectId, router]);

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  // Inline validation errors (only shown after field is touched)
  const hookError = touched.hook && hook.trim().length > 0 && hook.trim().length < 10 ? "Tagline must be at least 10 characters" : undefined;
  const synopsisError =
    !isTeaserLaunch && touched.synopsis && synopsis.trim().length > 0 && synopsis.trim().length < 50
      ? "Synopsis must be at least 50 characters"
      : undefined;
  const inspirationError = undefined;
  const titleError = touched.title && title.trim().length > 0 && title.trim().length < 3 ? "Title must be at least 3 characters" : undefined;

  if (authLoading || loadingProject) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={`composer-skeleton-${idx}`} className="skeleton-shimmer h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Log in to create a project</h1>
        <p className="mt-2 text-text-secondary">Your creator workshop is only available to authenticated users.</p>
        <LinkButton href="/login">Go to Login</LinkButton>
      </div>
    );
  }

  if (!profile?.is_creator) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Creator access required</h1>
        <p className="mt-2 text-text-secondary">Complete creator onboarding before launching project pages.</p>
        <LinkButton href="/onboarding">Open Onboarding</LinkButton>
      </div>
    );
  }

  return (
    <div className="brand-halo-bg mx-auto max-w-7xl px-4 py-6 pb-32 sm:py-8 sm:pb-32 lg:pb-20">
      <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
        &larr; Back to Dashboard
      </Link>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {lifecycleStatus === "teaser"
                ? "Edit Teaser"
                : lifecycleStatus !== "draft"
                  ? "Edit Project"
                  : isTeaserLaunch
                    ? "Teaser Composer"
                    : "Project Composer"}
            </h1>
            <p className="text-sm text-text-secondary">
              {lifecycleStatus === "teaser"
                ? "Edit your live teaser project. When you are ready, convert it into a preorder campaign or direct-to-production launch."
                : lifecycleStatus !== "draft"
                  ? "Edit your project details. Price and unlock target are locked after launch."
                  : isTeaserLaunch
                    ? "Post a real teaser project page with just the essentials. Characters, concept art, and longer story are optional polish."
                    : "Single-page composer for teaser, story, and preorder launch setup."}
            </p>
          </div>
          {lifecycleStatus !== "draft" ? (
            <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-500 uppercase">
              {lifecycleStatus.replaceAll("_", " ")}
            </span>
          ) : null}
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs text-text-secondary">
          {lifecycleStatus === "draft"
            ? `${launchReadyCount}/${launchChecklist.length} ${isTeaserLaunch ? "publish" : "launch"} items ready`
            : `${completionCount}/${totalSections} sections complete`}
        </span>
      </header>

      {communityBanner && (
        <div className="mb-4 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          Creating project from your community post. Title, teaser, and genre have been pre-filled.
        </div>
      )}
      {saveError ? <p className="mb-4 rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-sm text-role-danger-fg">{saveError}</p> : null}
      {submitError ? <p className="mb-4 rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-sm text-role-danger-fg">{submitError}</p> : null}
      {submitSuccess ? <p className="mb-4 rounded-lg border border-role-success-border bg-role-success-bg px-3 py-2 text-sm text-role-success-fg">{submitSuccess}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">1. Basics</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                label="Title *"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => markTouched("title")}
                maxLength={80}
                error={titleError}
                hint={`${title.length}/80`}
              />
              <Input
                label="Tagline *"
                value={hook}
                onChange={(event) => setHook(event.target.value)}
                onBlur={() => markTouched("hook")}
                maxLength={120}
                error={hookError}
                hint={`${hook.length}/120 · min 10`}
                placeholder="One-line pitch for your project"
              />
              <div>
                <Input
                  label="URL slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60));
                  }}
                  maxLength={60}
                  hint={slug ? `myriadspring.com/project/${slug}` : "Auto-generated from title"}
                />
                {slugState === "checking" ? (
                  <p className="mt-1 text-xs text-text-tertiary">Checking availability...</p>
                ) : slugState === "taken" ? (
                  <p className="mt-1 text-xs text-role-danger-fg">This URL is taken — try a different slug</p>
                ) : slugState === "available" ? (
                  <p className="mt-1 text-xs text-role-success-fg">Available</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Genre *"
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                  options={[{ value: "", label: "Select genre" }, ...PROJECT_GENRES.map((value) => ({ value, label: PROJECT_GENRE_LABELS[value] }))]}
                />
                <Select
                  label="Format"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  options={[{ value: "", label: "Select format" }, ...PROJECT_FORMATS.map((value) => ({ value, label: PROJECT_FORMAT_LABELS[value] }))]}
                />
                <Select
                  label="Tone"
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  options={[{ value: "", label: "Select tone" }, ...PROJECT_TONES.map((value) => ({ value, label: PROJECT_TONE_LABELS[value] }))]}
                />
                <Select
                  label="Content Rating *"
                  value={contentRating}
                  onChange={(event) => setContentRating(event.target.value)}
                  options={[{ value: "", label: "Select rating" }, ...CONTENT_RATINGS.map((value) => ({ value, label: CONTENT_RATING_LABELS[value] }))]}
                />
                <Input
                  label="Runtime (minutes)"
                  type="number"
                  min={1}
                  max={240}
                  value={runtimeMinutes}
                  onChange={(event) => setRuntimeMinutes(Number(event.target.value || 0))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">2. Teaser</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Teaser Video</label>
                <VideoUpload
                  currentAssetId={teaserAssetId || null}
                  onUpload={(id) => {
                    setTeaserAssetId(id);
                    setTeaserThumbnailUrl((current) => current || getProjectTeaserThumbnailUrl(null, id) || "");
                  }}
                  title={title ? `Teaser: ${title}` : "Project Teaser"}
                />
                {teaserAssetId && process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME ? (
                  <div className="mt-2 space-y-1.5">
                    <video
                      src={`https://${process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME}/${teaserAssetId}/play_720p.mp4`}
                      controls
                      muted
                      playsInline
                      className="w-full rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const autoThumbnail = getProjectTeaserThumbnailUrl(null, teaserAssetId);
                        setTeaserAssetId("");
                        if (teaserThumbnailUrl === autoThumbnail) {
                          setTeaserThumbnailUrl("");
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs text-role-danger-fg hover:underline"
                    >
                      <Trash2 size={12} /> Remove teaser
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Teaser Thumbnail</label>
                <ImageUpload
                  bucket="thumbnails"
                  currentUrl={teaserThumbnailUrl || null}
                  onUpload={(url) => setTeaserThumbnailUrl(url)}
                  aspectRatio="video"
                  maxSizeMB={5}
                />
                <p className="text-xs text-text-tertiary">
                  Optional. If you skip this, we will use a frame from the teaser video.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                3. Characters <span className="text-sm font-normal text-text-tertiary">(Optional)</span>
                <span className="ml-2 text-sm font-normal text-text-tertiary">{completeCharacterCards}/{characters.length} complete</span>
              </h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCharacters((prev) => (prev.length >= 5 ? prev : [...prev, defaultCharacter(prev.length)]))}
              >
                <Plus size={14} /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {characters.map((card, index) => (
                <div key={`character-${index}`} className="rounded-lg border border-border bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Character {index + 1}</p>
                    <button
                      type="button"
                      className="text-text-tertiary hover:text-role-danger-fg"
                      onClick={() => setCharacters((prev) => prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, sort_order: idx })))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      label="Name"
                      value={card.name}
                      onChange={(event) =>
                        setCharacters((prev) => prev.map((item, idx) => (idx === index ? { ...item, name: event.target.value } : item)))
                      }
                    />
                    <Input
                      label="Description"
                      value={card.short_description}
                      onChange={(event) =>
                        setCharacters((prev) =>
                          prev.map((item, idx) => (idx === index ? { ...item, short_description: event.target.value } : item))
                        )
                      }
                    />
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-text-primary">Image</label>
                        <ImageUpload
                          bucket="thumbnails"
                          currentUrl={card.media_asset_id || null}
                          onUpload={(url) =>
                            setCharacters((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, media_asset_id: url } : item
                              )
                            )
                          }
                          aspectRatio="portrait"
                          maxSizeMB={5}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-text-primary">Video clip (optional)</label>
                        <VideoUpload
                          currentAssetId={card.video_asset_id || null}
                          onUpload={(videoId) =>
                            setCharacters((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, video_asset_id: videoId } : item
                              )
                            )
                          }
                          title={card.name || `Character ${index + 1}`}
                          maxSizeMB={100}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-xs text-text-tertiary">
                Optional. Add characters if they help viewers connect faster with the project.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                4. Concept & World <span className="text-sm font-normal text-text-tertiary">(Optional)</span>
                <span className="ml-2 text-sm font-normal text-text-tertiary">{completeConceptCards}/{concepts.length} complete</span>
              </h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConcepts((prev) => (prev.length >= 5 ? prev : [...prev, defaultConcept(prev.length)]))}
              >
                <Plus size={14} /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {concepts.map((card, index) => (
                <div key={`concept-${index}`} className="rounded-lg border border-border bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Concept Card {index + 1}</p>
                    <button
                      type="button"
                      className="text-text-tertiary hover:text-role-danger-fg"
                      onClick={() => setConcepts((prev) => prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, sort_order: idx })))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      label="Caption"
                      value={card.caption}
                      onChange={(event) =>
                        setConcepts((prev) => prev.map((item, idx) => (idx === index ? { ...item, caption: event.target.value } : item)))
                      }
                    />
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-text-primary">Image</label>
                        <ImageUpload
                          bucket="thumbnails"
                          currentUrl={card.media_asset_id || null}
                          onUpload={(url) =>
                            setConcepts((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, media_asset_id: url } : item
                              )
                            )
                          }
                          aspectRatio="video"
                          maxSizeMB={5}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-text-primary">Video clip (optional)</label>
                        <VideoUpload
                          currentAssetId={card.video_asset_id || null}
                          onUpload={(videoId) =>
                            setConcepts((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, video_asset_id: videoId } : item
                              )
                            )
                          }
                          title={card.caption || `Concept ${index + 1}`}
                          maxSizeMB={100}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-xs text-text-tertiary">
                Optional. Add concept art or world references only if they make the page clearer.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">
                5. Story {isTeaserLaunch ? <span className="text-sm font-normal text-text-tertiary">(Optional)</span> : null}
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                label={isTeaserLaunch ? "Synopsis" : "Synopsis *"}
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value)}
                onBlur={() => markTouched("synopsis")}
                rows={5}
                maxLength={1000}
                error={synopsisError}
                hint={isTeaserLaunch ? `${synopsis.length}/1000 · optional` : `${synopsis.length}/1000 · min 50`}
              />
              <Input
                label="Inspiration"
                placeholder='e.g. "Blade Runner meets Her"'
                value={inspirationLine}
                onChange={(event) => setInspirationLine(event.target.value)}
                onBlur={() => markTouched("inspiration")}
                maxLength={200}
                error={inspirationError}
                hint={`Describe your project in terms of existing films/shows · ${inspirationLine.length}/200`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">
                {isTeaserLaunch ? "6. Teaser Mode" : "6. Preorder Setup"}
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {isTeaserLaunch ? (
                <>
                  <FoundingProgramPanel
                    status={foundingProgramStatus}
                    title="The first 100 creators who post a public teaser before the countdown ends get founding access automatically."
                    body="This is the qualifying action. Draft saves do not count. Launching a real teaser does."
                    primaryCtaHref="/founding-creators"
                    primaryCtaLabel="Program details"
                  />
                  <div className="rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white/85">
                    <p className="font-medium text-white">This publishes as a real teaser project page.</p>
                    <p className="mt-1 text-sm text-white/75">
                      No preorder target, no campaign deadline, no production window, and no launch fee. Viewers can watch the teaser, explore the world, save it, and join the discussion.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary space-y-1">
                    <p className="text-text-primary font-medium">What happens later</p>
                    <p>When you are ready, convert this teaser in place to either:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Seed Campaign</strong> to add price, target, and campaign timeline.</li>
                      <li><strong>Direct to Production</strong> to skip funding and start production immediately.</li>
                    </ul>
                    <p className="text-xs text-text-tertiary">
                      The same project page, slug, likes, saves, and discussion stay attached after conversion.
                    </p>
                  </div>
                  {lifecycleStatus === "teaser" && projectId ? (
                    <div className="rounded-lg border border-border bg-page-secondary p-3 text-sm text-text-secondary">
                      <p className="font-medium text-text-primary">Ready to convert?</p>
                      <p className="mt-1">Use the project dashboard to add pricing and dates when you want this teaser to enter the real launch pipeline.</p>
                      <Link href={`/dashboard?project=${projectId}`} className="mt-2 inline-block text-sm font-medium text-brand-500 hover:underline">
                        Open conversion controls →
                      </Link>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Launch mode</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {COMPOSER_LAUNCH_MODE_OPTIONS.map((option) => {
                        const active = launchMode === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={lifecycleStatus !== "draft"}
                            onClick={() => setLaunchMode(option.value)}
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              active
                                ? "border-brand-500 bg-brand-500/10 shadow-[0_0_18px_rgba(16,185,129,0.12)]"
                                : "border-border bg-surface hover:border-border/80"
                            } ${lifecycleStatus !== "draft" ? "cursor-not-allowed opacity-70" : ""}`}
                          >
                            <p className="text-sm font-semibold text-text-primary">{option.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-text-secondary">
                      Preorder projects need a target and campaign window. Direct to Production skips the campaign and starts in production immediately.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Preorder price ($) *"
                      type="number"
                      min={PREORDER_PRICE_MIN / 100}
                      max={PREORDER_PRICE_MAX / 100}
                      step={0.01}
                      value={(preorderPriceCents / 100).toFixed(2)}
                      disabled={lifecycleStatus !== "draft"}
                      onChange={(event) => {
                        const cents = Math.round(parseFloat(event.target.value || "0") * 100);
                        setPreorderPriceCents(Math.max(PREORDER_PRICE_MIN, Math.min(PREORDER_PRICE_MAX, cents)));
                      }}
                      hint={lifecycleStatus !== "draft" ? "Locked after launch" : `$${(PREORDER_PRICE_MIN / 100).toFixed(2)}–$${(PREORDER_PRICE_MAX / 100).toFixed(2)}`}
                    />
                    {isPreorderLaunch ? (
                      <Input
                        label="Unlock target"
                        type="number"
                        min={UNLOCK_TARGET_MIN}
                        max={UNLOCK_TARGET_MAX}
                        value={unlockTarget}
                        disabled={lifecycleStatus !== "draft"}
                        onChange={(event) => setUnlockTarget(Number(event.target.value || UNLOCK_TARGET_MIN))}
                        hint={lifecycleStatus !== "draft" ? "Locked after launch" : "Number of preorders needed to unlock your project (50% minimum to proceed)"}
                      />
                    ) : null}
                    {isPreorderLaunch ? (
                      <div className="space-y-1.5">
                        <Input
                          label="Campaign length (days)"
                          type="number"
                          min={CAMPAIGN_DURATION_MIN}
                          max={CAMPAIGN_DURATION_MAX}
                          value={campaignDurationDays}
                          disabled={lifecycleStatus !== "draft"}
                          onChange={(event) => setCampaignDurationDays(Math.max(CAMPAIGN_DURATION_MIN, Math.min(CAMPAIGN_DURATION_MAX, Number(event.target.value) || CAMPAIGN_DURATION_MIN)))}
                          hint={lifecycleStatus !== "draft" ? "Locked after launch" : `${CAMPAIGN_DURATION_MIN}–${CAMPAIGN_DURATION_MAX} days. How long viewers can preorder before the campaign closes.`}
                        />
                        <p className="text-[11px] text-text-tertiary">
                          Campaign fee: {FEES_WAIVED ? (
                            <span className="text-green-400">
                              <span className="line-through text-text-quaternary">${(calculateDurationFee(campaignDurationDays, CAMPAIGN_DURATION_MAX, CAMPAIGN_FEE_MAX_CENTS) / 100).toFixed(0)}</span>
                              {" "}$0 (waived during early access)
                            </span>
                          ) : (
                            <span>${(calculateDurationFee(campaignDurationDays, CAMPAIGN_DURATION_MAX, CAMPAIGN_FEE_MAX_CENTS) / 100).toFixed(0)}</span>
                          )}
                        </p>
                      </div>
                    ) : null}
                    <div className="space-y-1.5">
                      <Input
                        label="Production window (days)"
                        type="number"
                        min={PRODUCTION_WINDOW_MIN}
                        max={PRODUCTION_WINDOW_MAX}
                        value={productionWindowDays}
                        disabled={lifecycleStatus !== "draft"}
                        onChange={(event) => setProductionWindowDays(Math.max(PRODUCTION_WINDOW_MIN, Math.min(PRODUCTION_WINDOW_MAX, Number(event.target.value) || PRODUCTION_WINDOW_MIN)))}
                        hint={
                          lifecycleStatus !== "draft"
                            ? "Locked after launch"
                            : isProductionLaunch
                              ? `${PRODUCTION_WINDOW_MIN}–${PRODUCTION_WINDOW_MAX} days. How long you have to deliver the film after launch.`
                              : `${PRODUCTION_WINDOW_MIN}–${PRODUCTION_WINDOW_MAX} days. How long you have to deliver the film after your project unlocks.`
                        }
                      />
                      <p className="text-[11px] text-text-tertiary">
                        Production fee: {FEES_WAIVED ? (
                          <span className="text-green-400">
                            <span className="line-through text-text-quaternary">${(calculateDurationFee(productionWindowDays, PRODUCTION_WINDOW_MAX, PRODUCTION_FEE_MAX_CENTS) / 100).toFixed(0)}</span>
                            {" "}$0 (waived during early access)
                          </span>
                        ) : (
                          <span>${(calculateDurationFee(productionWindowDays, PRODUCTION_WINDOW_MAX, PRODUCTION_FEE_MAX_CENTS) / 100).toFixed(0)}</span>
                        )}
                      </p>
                    </div>
                    {format === "series" && (
                      <Input
                        label="Number of episodes *"
                        type="number"
                        min={EPISODE_COUNT_MIN}
                        max={EPISODE_COUNT_MAX}
                        value={episodeCount ?? ""}
                        disabled={lifecycleStatus !== "draft"}
                        onChange={(event) => setEpisodeCount(Number(event.target.value) || null)}
                        hint={lifecycleStatus !== "draft" ? "Locked after launch" : `${EPISODE_COUNT_MIN}–${EPISODE_COUNT_MAX} episodes per season`}
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text-primary">
                      Premiere &amp; release price
                    </label>
                    <p className="text-xs text-text-secondary">
                      Price for viewers during premiere and after release. Must be &ge; preorder price. $3–$200.
                    </p>
                    <Input
                      type="number"
                      min={RELEASE_PRICE_MIN / 100}
                      max={RELEASE_PRICE_MAX / 100}
                      step={0.01}
                      value={releasePriceCents ? (releasePriceCents / 100).toFixed(2) : ""}
                      onChange={(event) => {
                        setReleasePriceTouched(true);
                        const cents = Math.round(parseFloat(event.target.value || "0") * 100);
                        setReleasePriceCents(cents);
                      }}
                      placeholder={`${(preorderPriceCents / 100).toFixed(2)} or more`}
                      disabled={["premiering", "released"].includes(lifecycleStatus)}
                      hint={
                        ["premiering", "released"].includes(lifecycleStatus)
                          ? "Locked after premiere"
                          : ["unlocking", "in_production"].includes(lifecycleStatus)
                          ? "Can be changed until you set a premiere date"
                          : undefined
                      }
                    />
                    {releasePriceCents > 0 && releasePriceCents < preorderPriceCents && (
                      <p className="text-xs text-role-danger-fg">Release price must be &ge; preorder price</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary space-y-1">
                    <p>Launch mode: {isProductionLaunch ? "Direct to Production" : "Seed Campaign"}</p>
                    <p>Preorder price: {formatPrice(preorderPriceCents)}</p>
                    <p>Premiere / release price: {releasePriceCents ? formatPrice(releasePriceCents) : "Not set"}</p>
                    <div className="border-t border-border pt-1.5 mt-1.5">
                      <p className="text-text-primary font-medium">
                        {isProductionLaunch ? "Estimated creator share per preorder:" : "Estimated preorder earnings (at target):"}
                      </p>
                      {isProductionLaunch ? (
                        <p className="text-xs text-text-tertiary">
                          {formatPrice(preorderPriceCents)} × {100 - Math.round(PLATFORM_FEE_RATE * 100)}% = {formatPrice(Math.round(preorderPriceCents * (1 - PLATFORM_FEE_RATE)))}
                        </p>
                      ) : (
                        <p className="text-xs text-text-tertiary">
                          {unlockTarget} × {formatPrice(preorderPriceCents)} × {100 - Math.round(PLATFORM_FEE_RATE * 100)}% = {formatPrice(Math.round(preorderPriceCents * unlockTarget * (1 - PLATFORM_FEE_RATE)))}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary">Estimated release earnings: Varies based on post-release sales</p>
                    {isProductionLaunch ? (
                      <p className="text-xs text-text-tertiary">Preorders stay open until you schedule a premiere.</p>
                    ) : null}
                    <p className="text-xs text-text-tertiary">Platform fee: 20% on all transactions (founding creators get reduced rates)</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">{lifecycleStatus !== "draft" ? "7. Project Status" : "7. Preview & Launch"}</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {lifecycleStatus === "draft" ? (
                <>
                  <label className="flex items-start gap-3 rounded-xl border border-role-border-subtle bg-role-bg-page-secondary px-4 py-3">
                    <input
                      type="checkbox"
                      checked={rightsAttested}
                      onChange={(event) => setRightsAttested(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-role-border-subtle text-role-brand-600 focus:ring-role-cta-ring"
                    />
                    <span className="text-sm text-text-secondary">
                      I confirm I own or secured rights for visuals, music, voice, likeness, script,
                      and story elements in this project.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-role-border-subtle bg-role-bg-page-secondary px-4 py-3">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-role-border-subtle text-role-brand-600 focus:ring-role-cta-ring"
                    />
                    <span className="text-sm text-text-secondary">
                      I accept the{" "}
                      <a href="/creator-terms" target="_blank" rel="noreferrer" className="font-semibold text-text-primary underline underline-offset-4">
                        Myriad Creator Terms
                      </a>{" "}
                      (v1.0) and understand release-based payout and refund rules.
                    </span>
                  </label>

                  {isTeaserLaunch ? (
                    <p className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/80">
                      Only the teaser essentials block posting. Characters, concept art, and longer story are optional.
                    </p>
                  ) : null}

                  {!isTeaserLaunch ? (
                    <>
                      <div className="rounded-lg border border-border/50 bg-surface/50 p-3">
                        <p className="text-sm text-text-secondary">
                          Launch deposit: <span className="font-medium text-text-primary">$50</span>{" "}
                          <span className="text-role-success-fg">(waived during early access — $0 today)</span>
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-surface p-3 text-xs text-text-secondary space-y-1.5">
                        <p className="text-sm font-medium text-text-primary">What you&apos;re committing to</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Preorder price is <strong>locked after your first backer</strong> — set it carefully.</li>
                          <li>You can extend your deadline <strong>once</strong> (same options, capped at original window length). An update is required.</li>
                          <li>No updates + missed deadline + 14-day grace period = project marked as <strong>abandoned</strong> (auto-refund all preorders + strike).</li>
                          <li>Your funds are <strong>available after you deliver your film</strong> (+ 2-day review window). $50 minimum withdrawal.</li>
                          <li>First-time creators get a <strong>quality review</strong> before premiere goes live. Proven creators are auto-approved.</li>
                          <li>Content rating is required. Misrating may result in admin re-rating or a strike.</li>
                          <li>New creators: <strong>1 active project</strong> at a time. After 1st delivery: up to 3. After 3 deliveries: unlimited.</li>
                          <li>Platform fee: <strong>20%</strong> on all transactions (founding creators get reduced rates).</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-white/20 bg-white/5 p-3 text-xs text-white/80 space-y-1.5">
                      <p className="text-sm font-medium text-white">Teaser publish rules</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>No preorder or release pricing is attached yet.</li>
                        <li>No funding goal or deadline is shown to viewers.</li>
                        <li>You can keep editing the teaser project after it goes live.</li>
                        <li>Convert later when you are ready to add pricing, a target, and production timing.</li>
                      </ul>
                    </div>
                  )}
                </>
              ) : null}

              {lifecycleStatus === "draft" ? (
                <Button
                  onClick={() => setShowSubmitModal(true)}
                  disabled={submitting || !projectId || !submitRequirementsMet}
                >
                  {submitting ? (isTeaserLaunch ? "Posting..." : "Launching...") : launchActionLabel}
                </Button>
              ) : (
                <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm">
                  <p className="font-medium text-brand-500">{lifecycleStatus === "teaser" ? "Teaser is live" : "Project is live"}</p>
                  <p className="mt-1 text-text-secondary">
                    {lifecycleStatus === "teaser"
                      ? "Your teaser is already live. Story, character, concept, and teaser edits save automatically, and you can convert it later when you want to add pricing and launch timing."
                      : "Your project is already " + lifecycleStatus.replaceAll("_", " ") + ". Changes to story, characters, and concept art are saved automatically. Pricing and production commitments cannot be changed after launch."}
                  </p>
                  <Link href={`/project/${slug || projectId}`} className="mt-2 inline-block text-sm font-medium text-brand-500 hover:underline">
                    View Project Page →
                  </Link>
                </div>
              )}

              {projectId && moderationStatus === "private_draft" ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-role-danger-fg hover:underline disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deleting ? "Deleting..." : "Delete Draft"}
                </button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Live Preview</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                {resolvedTeaserThumbnailUrl ? (
                  <img src={resolvedTeaserThumbnailUrl} alt={title || "Project preview"} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="aspect-video w-full bg-page" />
                )}
              </div>

              <div>
                <p className="text-base font-semibold">{title || "Untitled Project"}</p>
                <p className="line-clamp-2 text-sm text-text-secondary">{hook || "Your tagline appears here."}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
                {genre ? <span className="rounded-full bg-surface px-2 py-1">{PROJECT_GENRE_LABELS[genre]}</span> : null}
                {format ? <span className="rounded-full bg-surface px-2 py-1">{PROJECT_FORMAT_LABELS[format]}</span> : null}
                {tone ? <span className="rounded-full bg-surface px-2 py-1">{PROJECT_TONE_LABELS[tone]}</span> : null}
                {contentRating ? (
                  <span className={`rounded-full px-2 py-1 ${
                    contentRating === "mature"
                      ? "bg-red-500/20 text-red-700 dark:text-red-400"
                      : contentRating === "teen"
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      : "bg-green-500/20 text-green-700 dark:text-green-400"
                  }`}>
                    {CONTENT_RATING_LABELS[contentRating]}
                  </span>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-surface p-3">
                {isTeaserLaunch ? (
                  <>
                    <p className="text-sm font-medium">Teaser Project</p>
                    <p className="text-xs text-text-tertiary">
                      Viewers see the teaser first. Story, characters, and concept art are optional extras you can add when useful.
                    </p>
                    <Button className="mt-2 w-full" size="sm" disabled>
                      Watch Teaser
                    </Button>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Convert later to add pricing, target, and production timeline.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">{isProductionLaunch ? "Direct to Production" : "Seed Campaign"}</p>
                    <p className="text-xs text-text-tertiary">
                      {isProductionLaunch ? "Preorders stay open until you set a premiere" : `0 / ${unlockTarget} preorders`}
                    </p>
                    <Button className="mt-2 w-full" size="sm" disabled>
                      Preorder {formatPrice(preorderPriceCents)}
                    </Button>
                    {releasePriceCents > 0 && (
                      <p className="mt-1.5 text-xs text-text-tertiary">Release: {formatPrice(releasePriceCents)}</p>
                    )}
                    <p className="mt-1 text-xs text-text-tertiary">
                      {isProductionLaunch ? `${productionWindowDays}-day production window` : `${campaignDurationDays}-day campaign`}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {lifecycleStatus === "draft" ? (
            <Card>
              <CardHeader>
                <h2 className="font-display text-lg font-semibold">{isTeaserLaunch ? "Ready to Publish" : "Ready to Launch"}</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{isTeaserLaunch ? "Publish checklist" : "Launch checklist"}</span>
                    <span className="font-medium text-text-primary">
                      {launchReadyCount}/{launchChecklist.length} ready
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {launchChecklist.map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-text-secondary">{item.label}</span>
                        <span className={item.ready ? "text-text-primary" : "text-text-tertiary"}>
                          {item.ready ? "Ready" : "Required"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className="hidden w-full lg:inline-flex"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={submitting || !projectId || !submitRequirementsMet}
                >
                  {submitting ? (isTeaserLaunch ? "Posting..." : "Launching...") : launchActionLabel}
                </Button>
                <p className="text-xs leading-relaxed text-text-tertiary">
                  {isTeaserLaunch
                    ? "The only blockers are the teaser essentials plus rights and terms. Optional polish can wait."
                    : "Keep filling section 7 for rights and terms, then launch from this sticky rail without having to scroll back to find the button."}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      {lifecycleStatus === "draft" ? (
        <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden">
          <div className="rounded-2xl border border-white/10 bg-surface/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                  {isTeaserLaunch ? "Ready to publish" : "Ready to launch"}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {launchReadyCount}/{launchChecklist.length} {isTeaserLaunch ? "publish" : "launch"} items ready
                </p>
              </div>
              <Button
                className="min-w-[150px]"
                onClick={() => setShowSubmitModal(true)}
                disabled={submitting || !projectId || !submitRequirementsMet}
              >
                {submitting ? (isTeaserLaunch ? "Posting..." : "Launching...") : launchActionLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Submit confirmation modal */}
      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-page p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 size={20} className="text-role-danger-fg" />
                <h3 className="font-display text-lg font-semibold">Delete Draft</h3>
              </div>
              <button type="button" onClick={() => setShowDeleteModal(false)} className="text-text-tertiary hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <p className="mb-5 text-sm text-text-secondary">
              This will permanently delete your draft project and all its content (characters, concepts, etc.). This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showSubmitModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-page p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-role-warning-fg" />
                <h3 className="font-display text-lg font-semibold">
                  {isTeaserLaunch ? "Post your teaser?" : isProductionLaunch ? "Launch your project?" : "Launch your campaign?"}
                </h3>
              </div>
              <button type="button" onClick={() => setShowSubmitModal(false)} className="text-text-tertiary hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-text-secondary">
              {isTeaserLaunch && foundingProgramStatus?.publicProgramOpen
                ? "Your teaser will go live immediately as a normal project page. If the public founding countdown is still open at launch time, this teaser can also claim one of the first 100 founding slots."
                : isTeaserLaunch
                ? "Your teaser will go live immediately as a normal project page. Viewers can watch it, explore the concept, save it, and join the discussion. You can convert it later when you are ready to add pricing and dates."
                : isProductionLaunch
                ? "Your project will go live immediately and start in production. Viewers can start preordering right away, and preorders stay open until you set a premiere."
                : "Your project will go live immediately. Viewers can start preordering right away. Some fields (price, unlock target) will be locked after launch."}
            </p>

            <div className="mb-5 space-y-1.5 rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-medium text-text-primary">{title || "Untitled Project"}</p>
              <div className="space-y-0.5 text-text-secondary">
                {isTeaserLaunch ? (
                  <>
                    <p>Mode: <span className="font-medium text-text-primary">Teaser Project</span></p>
                    <p>Public page: <span className="font-medium text-text-primary">/project/{slug || "your-slug"}</span></p>
                    <p>Conversion: <span className="font-medium text-text-primary">Add pricing and timeline later</span></p>
                  </>
                ) : (
                  <>
                    <p>Launch mode: <span className="font-medium text-text-primary">{isProductionLaunch ? "Direct to Production" : "Seed Campaign"}</span></p>
                    <p>Preorder price: <span className="font-medium text-text-primary">{formatPrice(preorderPriceCents)} (USD)</span></p>
                    {releasePriceCents ? (
                      <p>Release price: <span className="font-medium text-text-primary">{formatPrice(releasePriceCents)} (USD)</span></p>
                    ) : null}
                    {isPreorderLaunch ? (
                      <>
                        <p>Unlock target: <span className="font-medium text-text-primary">{unlockTarget.toLocaleString()} preorders</span></p>
                        <p>Campaign: <span className="font-medium text-text-primary">{campaignDurationDays} days</span></p>
                      </>
                    ) : null}
                    <p>Production window: <span className="font-medium text-text-primary">{productionWindowDays} days</span></p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => void confirmSubmit()} disabled={submitting}>
                {submitting ? (isTeaserLaunch ? "Posting..." : "Launching...") : (isTeaserLaunch ? "Post Teaser" : "Launch Now")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sticky bottom save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-page/95 backdrop-blur lg:bottom-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} isLive={lifecycleStatus !== "draft"} />
            <span className="text-xs text-text-tertiary">
              {lifecycleStatus === "draft"
                ? `${launchReadyCount}/${launchChecklist.length} ${isTeaserLaunch ? "publish" : "launch"} items ready`
                : `${completionCount}/${totalSections} sections`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lifecycleStatus !== "draft" && projectId ? (
              <Link href={`/project/${slug || projectId}`} className="text-xs text-text-secondary hover:text-text-primary">
                View Project →
              </Link>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              disabled={saveState === "saving" || !title.trim() || title.trim().length < 3}
              onClick={() => void saveProject()}
            >
              {lifecycleStatus !== "draft" ? "Save" : "Save Draft"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="cta-energy mt-4 inline-flex rounded-lg px-4 py-2 text-sm font-semibold">
      {children}
    </a>
  );
}
