-- Quotation form redesign - additional fields
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_whatsapp VARCHAR(50);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS air_ticket_adult_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS air_ticket_child_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS air_ticket_infant_pkr NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS suggested_upgrades JSONB;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS upgrades_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0;
