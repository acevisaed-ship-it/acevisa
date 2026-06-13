-- Add subcategory to expenses table for finer-grained P&L drill-down
-- e.g. category='office', subcategory='Rent' | 'Electricity' | 'Internet'
--      category='marketing', subcategory='Google Ads' | 'Facebook Ads'
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS subcategory text;

CREATE INDEX IF NOT EXISTS idx_expenses_category_subcategory
  ON expenses (category, subcategory);
