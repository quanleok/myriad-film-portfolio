export interface CreatorProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  social_links: Record<string, string>;
  subscriber_count: number;
  total_views: number;
  subscription_price_cents: number | null;
  stripe_onboarding_complete: boolean;
  created_at: string;
}
