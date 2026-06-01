-- Umrah Quotation System V2 - Database Schema (20 tables)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core Tables
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions_bitmask BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role VARCHAR(50) NOT NULL DEFAULT 'STAFF',
  staff_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Hotel Management
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT,
  distance_label VARCHAR(200),
  distance_m INT,
  markaziya_status VARCHAR(20) CHECK (markaziya_status IN ('INSIDE', 'OUTSIDE') OR markaziya_status IS NULL),
  category VARCHAR(50),
  amenities TEXT[] NOT NULL DEFAULT '{}',
  contact_phone VARCHAR(30),
  cancellation_policy TEXT,
  staff_notes TEXT,
  pricing_model VARCHAR(20) DEFAULT 'BOTH',
  sharing_rate_per_bed NUMERIC(10,2),
  offers_sharing BOOLEAN NOT NULL DEFAULT true,
  offers_private BOOLEAN NOT NULL DEFAULT true,
  meal_plan_bb_premium_sar NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  enabled_room_types TEXT[] NOT NULL DEFAULT ARRAY['Single','Double','Triple','Quad'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hotels_org ON hotels(organization_id);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type VARCHAR(50) NOT NULL,
  base_price_sar NUMERIC(10,2) NOT NULL,
  max_occupancy INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(hotel_id, room_type)
);

CREATE INDEX IF NOT EXISTS idx_hotel_rooms_hotel ON hotel_rooms(hotel_id);

CREATE TABLE IF NOT EXISTS hotel_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  season_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_hotel_seasons_hotel ON hotel_seasons(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_seasons_dates ON hotel_seasons(hotel_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS hotel_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hotel_commissions_hotel ON hotel_commissions(hotel_id);

CREATE TABLE IF NOT EXISTS hotel_rate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  quotation_id UUID,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_rate_snapshots_quotation ON hotel_rate_snapshots(quotation_id);

-- Transport Management
CREATE TABLE IF NOT EXISTS transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  start_city VARCHAR(100) NOT NULL,
  end_city VARCHAR(100) NOT NULL,
  distance_km NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type VARCHAR(100) NOT NULL UNIQUE,
  capacity_pax INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(100) NOT NULL,
  price_sar NUMERIC(10,2) NOT NULL,
  is_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(route_id, vehicle_type)
);

CREATE INDEX IF NOT EXISTS idx_transport_rates_route ON transport_rates(route_id);

-- Visa Categories
CREATE TABLE IF NOT EXISTS visa_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  adult_child_rate_sar NUMERIC(10,2) NOT NULL,
  infant_rate_sar NUMERIC(10,2) NOT NULL DEFAULT 490.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Quotations & Details
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  staff_id UUID REFERENCES users(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  adults INT NOT NULL DEFAULT 0,
  children_with_bed INT NOT NULL DEFAULT 0,
  children_without_bed INT NOT NULL DEFAULT 0,
  infants INT NOT NULL DEFAULT 0,
  total_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
  hotel_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  visa_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  transfers_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  flights_cost_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_status VARCHAR(50) DEFAULT 'NONE',
  currency_rate_snapshot NUMERIC(10,4) NOT NULL DEFAULT 74.5,
  price_snapshot_json JSONB,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_staff ON quotations(staff_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

CREATE TABLE IF NOT EXISTS quotation_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  city VARCHAR(100) NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INT NOT NULL,
  view_modifier VARCHAR(20) NOT NULL DEFAULT 'NONE',
  meal_plan VARCHAR(10) NOT NULL DEFAULT 'RO',
  room_type_1 VARCHAR(50),
  quantity_1 INT NOT NULL DEFAULT 0,
  room_type_2 VARCHAR(50),
  quantity_2 INT NOT NULL DEFAULT 0,
  booking_mode VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
  sharing_pax INT NOT NULL DEFAULT 0,
  subtotal_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quotation_hotels_quotation ON quotation_hotels(quotation_id);

CREATE TABLE IF NOT EXISTS quotation_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES transport_routes(id),
  vehicle_type VARCHAR(100) NOT NULL,
  quantity_pax INT NOT NULL,
  is_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  seat_rate_sar NUMERIC(10,2),
  total_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_transport_quotation ON quotation_transport(quotation_id);

CREATE TABLE IF NOT EXISTS quotation_visas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  visa_category_id UUID NOT NULL REFERENCES visa_categories(id),
  num_adults_children INT NOT NULL DEFAULT 0,
  num_infants INT NOT NULL DEFAULT 0,
  total_cost_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost_pkr NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_visas_quotation ON quotation_visas(quotation_id);

-- Commission & Invoicing
CREATE TABLE IF NOT EXISTS staff_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id),
  quotation_id UUID NOT NULL REFERENCES quotations(id),
  commission_amount_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_commissions_staff ON staff_commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_commissions_quotation ON staff_commissions(quotation_id);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id),
  total_amount_sar NUMERIC(12,2) NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invoices_quotation ON invoices(quotation_id);

-- Audit
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  changes_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- FK for hotel_rate_snapshots.quotation_id (added after quotations table exists)
ALTER TABLE hotel_rate_snapshots
  DROP CONSTRAINT IF EXISTS hotel_rate_snapshots_quotation_id_fkey;
ALTER TABLE hotel_rate_snapshots
  ADD CONSTRAINT hotel_rate_snapshots_quotation_id_fkey
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE;
