-- Draft auto-save and edit audit
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS draft_form_json JSONB;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_quotations_expiry ON quotations(expiry_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_commissions_quotation_staff
  ON staff_commissions(quotation_id, staff_id);
