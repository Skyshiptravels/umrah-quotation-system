-- Financial integration: revenue tracking and client linkage

ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS revenue_received BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_tx_quotation_unique
  ON financial_transactions(quotation_id)
  WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_tx_client ON financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_revenue_received ON financial_transactions(revenue_received);
