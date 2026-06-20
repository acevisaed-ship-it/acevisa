-- Link deals to a product so the pipeline shows what service was sold

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_product_id ON deals (product_id);
