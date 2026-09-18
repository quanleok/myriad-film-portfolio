-- Add missing event types for refund balance reversals and purchase refunds
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'creator_balance_reversal';
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'purchase_refund';
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'dispute_reversal';

-- Add missing entitlement source for dispute reversals
ALTER TYPE entitlement_source ADD VALUE IF NOT EXISTS 'dispute_reversal';
