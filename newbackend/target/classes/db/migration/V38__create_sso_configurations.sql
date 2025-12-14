-- SSO Configurations table
CREATE TABLE sso_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL DEFAULT 'OIDC',
    enabled BOOLEAN DEFAULT false,
    
    -- OAuth 2.0 / OIDC settings
    client_id VARCHAR(255),
    client_secret_encrypted TEXT,
    authorization_endpoint VARCHAR(500),
    token_endpoint VARCHAR(500),
    userinfo_endpoint VARCHAR(500),
    issuer VARCHAR(500),
    jwks_uri VARCHAR(500),
    
    -- Claim mapping settings
    email_claim VARCHAR(100) DEFAULT 'email',
    name_claim VARCHAR(100) DEFAULT 'name',
    sub_claim VARCHAR(100) DEFAULT 'sub',
    
    -- Additional parameters
    scopes TEXT DEFAULT 'openid,profile,email',
    require_sso BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id)
);

CREATE INDEX idx_sso_org ON sso_configurations(organization_id);

-- SSO User Links table
CREATE TABLE sso_user_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sso_provider_id VARCHAR(255) NOT NULL,
    sso_email VARCHAR(255) NOT NULL,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, sso_provider_id),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_sso_links_user ON sso_user_links(user_id);
CREATE INDEX idx_sso_links_org ON sso_user_links(organization_id);

-- SSO State table for CSRF protection
CREATE TABLE sso_states (
    state VARCHAR(255) PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code_verifier VARCHAR(255),
    redirect_uri VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_sso_states_expires ON sso_states(expires_at);

