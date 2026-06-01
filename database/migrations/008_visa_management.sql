-- Enhanced visa management (Tier 1 + 2)

ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS processing_time_days INTEGER NOT NULL DEFAULT 3;
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS validity_days INTEGER NOT NULL DEFAULT 28;
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS documents_required TEXT[] NOT NULL DEFAULT ARRAY['Passport', 'Photo']::TEXT[];
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS special_conditions TEXT;
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00;
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS summer_rate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00;
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS winter_rate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00;
ALTER TABLE visa_categories ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

UPDATE visa_categories SET documents_required = ARRAY['Passport', 'Photo']::TEXT[]
WHERE documents_required IS NULL OR cardinality(documents_required) = 0;

CREATE TABLE IF NOT EXISTS visa_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_id UUID NOT NULL REFERENCES visa_categories(id) ON DELETE CASCADE,
  field_changed VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visa_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_id UUID NOT NULL REFERENCES visa_categories(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  season VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_visa_categories_code ON visa_categories(code);
CREATE INDEX IF NOT EXISTS idx_visa_categories_is_active ON visa_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_visa_rate_history_visa_id ON visa_rate_history(visa_id);
CREATE INDEX IF NOT EXISTS idx_visa_rate_history_changed_at ON visa_rate_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_visa_usage_stats_visa_id ON visa_usage_stats(visa_id);
CREATE INDEX IF NOT EXISTS idx_visa_usage_stats_used_at ON visa_usage_stats(used_at DESC);
