-- Link invoices to a product so vendor costs and commissions are tracked automatically

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_product_id ON invoices (product_id);
