/**
 * ZentrixCRM — Full Database Migration
 * Run: node db/migrate.js
 *
 * Multi-tenant schema where every table has a tenant_id column
 * so one database can serve multiple real-estate companies.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'zentrixcrm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

const SCHEMA = `

-- ═══════════════════════════════════════════════════════════════════
--  EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for fast text search

-- ═══════════════════════════════════════════════════════════════════
--  TENANTS (SaaS companies — each real estate firm is one tenant)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,   -- used in subdomain / URL
    logo_url        TEXT,
    primary_color   VARCHAR(20) DEFAULT '#1e3a73',
    plan            VARCHAR(50) DEFAULT 'trial',    -- trial | starter | pro | enterprise
    plan_expires_at TIMESTAMPTZ,
    max_users       INT DEFAULT 3,
    max_leads       INT DEFAULT 500,
    max_projects    INT DEFAULT 5,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  USERS  (staff of a tenant — agents, managers, admins)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'agent',   -- admin | sales_manager | agent
    avatar          VARCHAR(10),                              -- initials e.g. 'AS'
    phone           VARCHAR(20),
    department      VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ═══════════════════════════════════════════════════════════════════
--  REFRESH TOKENS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  PROJECTS  (real estate projects / developments)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    location        VARCHAR(300),
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'Active',     -- Active | Pre-Launch | Completed | On Hold
    total_units     INT DEFAULT 0,
    available_units INT DEFAULT 0,
    price_range     VARCHAR(100),
    possession_date DATE,
    rera_number     VARCHAR(100),
    amenities       JSONB DEFAULT '[]',
    images          JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  INVENTORY  (individual units within a project)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    unit_no         VARCHAR(50) NOT NULL,
    floor           INT,
    area_sqft       DECIMAL(10,2),
    property_type   VARCHAR(50),     -- 1BHK | 2BHK | 3BHK | Villa | etc.
    facing          VARCHAR(50),
    base_price      DECIMAL(15,2),
    status          VARCHAR(50) DEFAULT 'Available',  -- Available | Booked | Sold | Blocked
    booking_id      UUID,            -- set when booked
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, project_id, unit_no)
);

-- ═══════════════════════════════════════════════════════════════════
--  LEADS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    city            VARCHAR(100),
    source          VARCHAR(100) DEFAULT 'Website',
    stage           VARCHAR(50)  DEFAULT 'New',   -- New | Contacted | Site Visit | Negotiation | Won | Lost
    priority        VARCHAR(20)  DEFAULT 'Medium',
    score           INT          DEFAULT 50,
    property_type   VARCHAR(50),
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    budget          VARCHAR(50),
    notes           TEXT,
    last_contact_at TIMESTAMPTZ,
    is_duplicate    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant     ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage      ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned   ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_search     ON leads USING gin(to_tsvector('english', name || ' ' || COALESCE(email,'') || ' ' || COALESCE(phone,'')));

-- ═══════════════════════════════════════════════════════════════════
--  CUSTOMERS  (leads that converted to buyers)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    address         TEXT,
    city            VARCHAR(100),
    pan_number      VARCHAR(20),
    aadhar_number   VARCHAR(20),
    dob             DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  BOOKINGS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bookings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id         UUID NOT NULL REFERENCES customers(id),
    project_id          UUID NOT NULL REFERENCES projects(id),
    unit_id             UUID REFERENCES inventory(id),
    unit_no             VARCHAR(50),
    assigned_agent_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    booking_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount        DECIMAL(15,2),
    payment_plan        VARCHAR(100),    -- Construction Linked | Down Payment | EMI | Subvention
    status              VARCHAR(50) DEFAULT 'Pending Docs',
    token_amount        DECIMAL(15,2),
    token_collected     BOOLEAN DEFAULT FALSE,
    token_date          DATE,
    token_mode          VARCHAR(50),     -- Cheque | NEFT | UPI | Cash | DD
    token_reference     VARCHAR(200),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant   ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);

-- ═══════════════════════════════════════════════════════════════════
--  PAYMENT PLANS & INSTALLMENTS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_plans (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    plan_name   VARCHAR(100),
    total_amount DECIMAL(15,2),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    milestone       VARCHAR(200),
    amount          DECIMAL(15,2),
    percentage      DECIMAL(5,2),
    due_date        DATE,
    paid_date       DATE,
    status          VARCHAR(30) DEFAULT 'Upcoming',  -- Upcoming | Paid | Overdue
    receipt_no      VARCHAR(100),
    payment_mode    VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_booking ON installments(booking_id);
CREATE INDEX IF NOT EXISTS idx_installments_status  ON installments(status);

-- ═══════════════════════════════════════════════════════════════════
--  FOLLOW-UPS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS followups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    type        VARCHAR(50) DEFAULT 'Call',   -- Call | Email | WhatsApp | Meeting | Site Visit
    priority    VARCHAR(20) DEFAULT 'Medium',
    scheduled_at TIMESTAMPTZ NOT NULL,
    status      VARCHAR(30) DEFAULT 'Pending',  -- Pending | Completed | Cancelled | Rescheduled
    note        TEXT,
    outcome     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_tenant     ON followups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled  ON followups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_followups_assigned   ON followups(assigned_to);

-- ═══════════════════════════════════════════════════════════════════
--  SITE VISITS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_visits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
    assigned_agent  UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    transport       VARCHAR(50) DEFAULT 'Agent Car',
    pickup_location TEXT,
    status          VARCHAR(30) DEFAULT 'Scheduled',  -- Scheduled | Completed | Cancelled | No Show
    feedback        TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  CHANNEL PARTNERS (brokers / outside agents)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS channel_partners (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    company         VARCHAR(200),
    email           VARCHAR(255),
    phone           VARCHAR(20),
    city            VARCHAR(100),
    rera_number     VARCHAR(100),
    status          VARCHAR(30) DEFAULT 'Active',    -- Active | Inactive | Pending
    commission_rate DECIMAL(5,2) DEFAULT 2.0,        -- percentage
    total_leads_referred INT DEFAULT 0,
    total_bookings  INT DEFAULT 0,
    total_commission DECIMAL(15,2) DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  AGREEMENTS & DOCUMENTS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    name            VARCHAR(300) NOT NULL,
    type            VARCHAR(100),    -- Agreement | ID Proof | Payment Receipt | NOC | etc.
    file_url        TEXT,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    status          VARCHAR(50) DEFAULT 'Pending Signature',
    signed_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  NOTIFICATIONS LOG
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sent_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
    channel     VARCHAR(30) NOT NULL,   -- SMS | Email | WhatsApp
    recipient   VARCHAR(300),
    subject     VARCHAR(500),
    body        TEXT NOT NULL,
    status      VARCHAR(30) DEFAULT 'Sent',   -- Sent | Delivered | Failed | Read
    sent_at     TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  ENQUIRIES (from the public /enquiry form)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS enquiries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    email           VARCHAR(255),
    city            VARCHAR(100),
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    property_type   VARCHAR(50),
    budget          VARCHAR(50),
    source          VARCHAR(100),
    message         TEXT,
    ref_no          VARCHAR(50) UNIQUE,
    status          VARCHAR(30) DEFAULT 'New',   -- New | Contacted | Converted | Junk
    converted_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
--  ACTIVITY LOG (audit trail)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,   -- lead | booking | customer | user
    entity_id   UUID,
    action      VARCHAR(100) NOT NULL,  -- created | updated | stage_changed | deleted
    old_data    JSONB,
    new_data    JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);

-- ═══════════════════════════════════════════════════════════════════
--  SUBSCRIPTIONS / BILLING (for SaaS monetization)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan            VARCHAR(50) NOT NULL,   -- trial | starter | pro | enterprise
    status          VARCHAR(30) DEFAULT 'active',   -- active | cancelled | expired | past_due
    amount          DECIMAL(10,2),
    currency        VARCHAR(10) DEFAULT 'INR',
    billing_cycle   VARCHAR(20) DEFAULT 'monthly',
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    gateway         VARCHAR(50),           -- razorpay | stripe
    gateway_sub_id  VARCHAR(200),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Commissions & Incentives
CREATE TABLE IF NOT EXISTS commissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     VARCHAR(50) NOT NULL, -- 'Internal' | 'Channel Partner'
    entity_id       UUID NOT NULL, -- user_id or channel_partner_id
    lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
    booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
    deal_value      DECIMAL(15,2),
    commission_rate DECIMAL(5,2),
    payout_amount   DECIMAL(15,2) NOT NULL,
    status          VARCHAR(30) DEFAULT 'Pending', -- Pending | Paid
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_tenant ON commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commissions_entity ON commissions(entity_id);
CREATE INDEX IF NOT EXISTS idx_commissions_booking ON commissions(booking_id);

-- ═══════════════════════════════════════════════════════════════════
--  UPDATED_AT triggers
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','users','projects','inventory','leads',
    'customers','bookings','installments','payment_plans','followups',
    'site_visits','channel_partners','documents','subscriptions', 'commissions']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t);
  END LOOP;
END;
$$;
`;

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Running migrations...');
        await client.query(SCHEMA);
        console.log('✅ All tables created successfully!');
        console.log('');
        console.log('Tables created:');
        const res = await client.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);
        res.rows.forEach(r => console.log('  ✓', r.tablename));
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(process.exit);
