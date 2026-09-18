-- Add missing financial event type enum values for refund flows
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'refund_balance_debit';
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'preorder_refunded';
