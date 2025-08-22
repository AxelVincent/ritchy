-- Populate credits for existing users based on their subscription plans
-- This migration ensures all users have appropriate credit allocations
-- Only active subscriptions get plan-based credits, others get FREE plan defaults

-- First, create credits records for users who don't have them yet
INSERT INTO "credits" ("user_id", "enrichment", "search", "created_at", "updated_at")
SELECT 
    u.id,
    CASE 
        WHEN s.plan = 'ESSENTIALS' AND s.status = 'active' THEN 1500
        WHEN s.plan = 'PRO' AND s.status = 'active' THEN 5000
        ELSE 20  -- FREE plan default for inactive/cancelled/no subscription
    END as enrichment,
    CASE 
        WHEN s.plan = 'ESSENTIALS' AND s.status = 'active' THEN 5000
        WHEN s.plan = 'PRO' AND s.status = 'active' THEN 15000
        ELSE 200  -- FREE plan default for inactive/cancelled/no subscription
    END as search,
    NOW(),
    NOW()
FROM "user" u
LEFT JOIN "subscription" s ON u.id = s."user_id"
WHERE NOT EXISTS (
    SELECT 1 FROM "credits" c WHERE c."user_id" = u.id
);

-- Update existing credits records for users with active subscriptions to match their plan
UPDATE "credits" c
SET 
    "enrichment" = CASE 
        WHEN s.plan = 'ESSENTIALS' AND s.status = 'active' THEN 1500
        WHEN s.plan = 'PRO' AND s.status = 'active' THEN 5000
        ELSE 20  -- FREE plan default for inactive/cancelled
    END,
    "search" = CASE 
        WHEN s.plan = 'ESSENTIALS' AND s.status = 'active' THEN 5000
        WHEN s.plan = 'PRO' AND s.status = 'active' THEN 15000
        ELSE 200  -- FREE plan default for inactive/cancelled
    END,
    "updated_at" = NOW()
FROM "subscription" s
WHERE c."user_id" = s."user_id";

-- For users without subscriptions or with inactive subscriptions, set to FREE plan defaults
UPDATE "credits" c
SET 
    "enrichment" = 20,
    "search" = 200,
    "updated_at" = NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "subscription" s WHERE s."user_id" = c."user_id" AND s.status = 'active'
);