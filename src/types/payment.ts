import type { PaymentStatus, PayoutStatus } from "./database";

export interface Purchase {
  id: string;
  viewer_id: string;
  video_id: string;
  creator_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  creator_earnings_cents: number;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  creator_id: string;
  price_cents: number;
  is_active: boolean;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  creator_id: string;
  amount_cents: number;
  payout_status: PayoutStatus;
  period_start: string;
  period_end: string;
  created_at: string;
}
