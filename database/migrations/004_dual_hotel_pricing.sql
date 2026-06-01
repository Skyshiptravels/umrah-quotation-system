-- Sharing + Private dual pricing model

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS sharing_rate_per_bed NUMERIC(10,2);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS offers_sharing BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS offers_private BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE quotation_hotels ADD COLUMN IF NOT EXISTS booking_mode VARCHAR(20) DEFAULT 'PRIVATE';
ALTER TABLE quotation_hotels ADD COLUMN IF NOT EXISTS sharing_pax INT DEFAULT 0;
