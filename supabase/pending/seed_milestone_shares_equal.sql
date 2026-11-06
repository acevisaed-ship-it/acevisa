-- Equal milestone shares for every active study visa product: 25 / 25 / 25 / 25.
-- Idempotent. Review, then: npx.cmd supabase db query --linked --file supabase/pending/seed_milestone_shares_equal.sql
INSERT INTO product_milestone_shares (product_id, milestone_type, share_pct)
SELECT p.id, m.t, 25
FROM products p
CROSS JOIN (VALUES ('offer_letter'),('loa_cas'),('visa_filed'),('visa_granted')) AS m(t)
WHERE p.category = 'study_visa' AND p.is_active
ON CONFLICT (product_id, milestone_type) DO NOTHING;

-- Check: every study visa product sums to 100 (expect 0 rows)
SELECT product_id, sum(share_pct) FROM product_milestone_shares GROUP BY 1 HAVING sum(share_pct) <> 100;
