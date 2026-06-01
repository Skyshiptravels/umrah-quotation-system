-- Financial tracking

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  revenue_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  revenue_currency VARCHAR(3) NOT NULL DEFAULT 'SAR',
  vendor_cost_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendor_cost_items JSONB NOT NULL DEFAULT '{}',
  gross_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  staff_commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  company_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profit_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  summary_date DATE NOT NULL,
  daily_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_vendor_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_gross_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_company_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  quotations_count INT NOT NULL DEFAULT 0,
  average_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(organization_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_tx_org ON financial_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_profit_summary_org_date ON profit_summary(organization_id, summary_date);
