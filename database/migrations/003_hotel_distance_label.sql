ALTER TABLE hotels ADD COLUMN IF NOT EXISTS distance_label VARCHAR(200);

UPDATE hotels
SET distance_label = SPLIT_PART(staff_notes, '. ', 1)
WHERE distance_label IS NULL
  AND staff_notes IS NOT NULL
  AND staff_notes <> '';
