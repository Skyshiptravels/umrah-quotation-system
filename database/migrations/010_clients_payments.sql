-- Client management and payment tracking

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  whatsapp_number VARCHAR(30),
  preferred_contact VARCHAR(20) DEFAULT 'EMAIL',
  budget_range VARCHAR(50),
  preferred_dates TEXT,
  travel_group_size INT,
  special_requirements TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  total_bookings INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_booking_date DATE,
  repeat_customer BOOLEAN NOT NULL DEFAULT false,
  assigned_staff_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, email)
);

CREATE TABLE IF NOT EXISTS client_communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  communication_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(20) DEFAULT 'SENT',
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  invoice_number VARCHAR(100),
  amount_due NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_due_date DATE,
  payment_received_date DATE,
  payment_method VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES client_payments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  reminder_date DATE NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  sent_method VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_id UUID;

DO $$ BEGIN
  ALTER TABLE quotations
    ADD CONSTRAINT fk_quotations_client
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_client_payments_client ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_status ON client_payments(status);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);
