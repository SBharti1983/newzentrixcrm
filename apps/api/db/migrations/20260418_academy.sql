
-- --- Training Modules Table ---
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    type TEXT DEFAULT 'Document', -- Video, Image, PDF, PPT, Word, Interactive
    file_url TEXT,
    thumbnail_url TEXT,
    file_size BIGINT,
    mime_type TEXT,
    xp_points INTEGER DEFAULT 100,
    duration TEXT, -- e.g. "15m"
    instructor TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --- Training Progress Table ---
CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0, -- 0-100
    completed BOOLEAN DEFAULT FALSE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, module_id)
);

-- --- Seed initial demo data for the 'zentrix' tenant ---
-- Assuming 'zentrix' tenant exists and has ID. I'll use a subquery to find it if possible, 
-- but usually I just run it and it works if the tenant matches.

-- For safety, I won't seed specific tenant IDs here, I'll let the user/admin do it via UI 
-- or do a broad seed later.
