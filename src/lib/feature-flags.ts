// =============================================================================
// Feature Flags — Myriad Spring v1.1
// Controls new-system enabling. Old legacy flags removed (all defaulted OFF,
// nothing imported them).
// =============================================================================

// --- New system flags (default ON, set to "false" to disable) ---

/** Project system (project pages, browse projects) */
export const FF_PROJECTS_ENABLED =
  process.env.NEXT_PUBLIC_FF_PROJECTS_ENABLED !== "false";

/** Explore feed (vertical Reels-style discovery) */
export const FF_EXPLORE_ENABLED =
  process.env.NEXT_PUBLIC_FF_EXPLORE_ENABLED !== "false";

/** Library page (preorder-centric viewer library) */
export const FF_LIBRARY_ENABLED =
  process.env.NEXT_PUBLIC_FF_LIBRARY_ENABLED !== "false";

/** Project composer (/projects/new) */
export const FF_PROJECT_COMPOSER_ENABLED =
  process.env.NEXT_PUBLIC_FF_PROJECT_COMPOSER_ENABLED !== "false";

/** Preorder checkout (Stripe Elements bottom sheet) */
export const FF_PREORDER_CHECKOUT_ENABLED =
  process.env.NEXT_PUBLIC_FF_PREORDER_CHECKOUT_ENABLED !== "false";

/** New project-centric creator dashboard */
export const FF_PROJECT_DASHBOARD_ENABLED =
  process.env.NEXT_PUBLIC_FF_PROJECT_DASHBOARD_ENABLED !== "false";

/** Cinematic Neon brand system v2 (visual-only) */
export const FF_BRAND_V2 =
  process.env.NEXT_PUBLIC_FF_BRAND_V2 === "true";

// --- Convenience helper ---

export type FeatureFlag =
  | "FF_PROJECTS_ENABLED"
  | "FF_EXPLORE_ENABLED"
  | "FF_LIBRARY_ENABLED"
  | "FF_PROJECT_COMPOSER_ENABLED"
  | "FF_PREORDER_CHECKOUT_ENABLED"
  | "FF_PROJECT_DASHBOARD_ENABLED"
  | "FF_BRAND_V2";

const FLAGS: Record<FeatureFlag, boolean> = {
  FF_PROJECTS_ENABLED,
  FF_EXPLORE_ENABLED,
  FF_LIBRARY_ENABLED,
  FF_PROJECT_COMPOSER_ENABLED,
  FF_PREORDER_CHECKOUT_ENABLED,
  FF_PROJECT_DASHBOARD_ENABLED,
  FF_BRAND_V2,
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag];
}
