-- Hotel metadata: markaziya, distance, category, amenities (Phase 1)

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS distance_m INT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS markaziya_status VARCHAR(20)
  CHECK (markaziya_status IN ('INSIDE', 'OUTSIDE') OR markaziya_status IS NULL);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS staff_notes TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20) DEFAULT 'BOTH';

CREATE INDEX IF NOT EXISTS idx_hotels_markaziya ON hotels(city, markaziya_status);
CREATE INDEX IF NOT EXISTS idx_hotels_distance ON hotels(city, distance_m);
