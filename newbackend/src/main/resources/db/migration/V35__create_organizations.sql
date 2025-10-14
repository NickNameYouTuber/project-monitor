CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    require_password BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    
    corporate_domain VARCHAR(255),
    require_corporate_email BOOLEAN DEFAULT FALSE,
    
    logo_url TEXT,
    website VARCHAR(500),
    default_project_role VARCHAR(32) DEFAULT 'DEVELOPER',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    owner_id UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(32) NOT NULL,
    
    corporate_email VARCHAR(255),
    corporate_email_verified BOOLEAN DEFAULT FALSE,
    
    org_password_hash TEXT,
    
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    last_active_at TIMESTAMPTZ,
    
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id),
    CONSTRAINT uq_org_corporate_email UNIQUE (organization_id, corporate_email)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

CREATE TABLE IF NOT EXISTS organization_invites (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    token VARCHAR(64) NOT NULL UNIQUE,
    
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    
    email_domains TEXT[],
    
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_expires ON organization_invites(expires_at);

