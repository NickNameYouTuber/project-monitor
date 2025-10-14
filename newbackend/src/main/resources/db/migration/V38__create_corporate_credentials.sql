CREATE TABLE corporate_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    corporate_username VARCHAR(255),
    corporate_email VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE TABLE identity_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE,
    provider_name VARCHAR(255),
    api_key VARCHAR(255) UNIQUE,
    api_secret TEXT,
    webhook_url VARCHAR(500),
    allowed_domains TEXT,
    require_email_verification BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_corporate_credentials_user ON corporate_credentials(user_id);
CREATE INDEX idx_corporate_credentials_org ON corporate_credentials(organization_id);
CREATE INDEX idx_corporate_credentials_email ON corporate_credentials(corporate_email);
CREATE INDEX idx_identity_provider_api_key ON identity_provider_configs(api_key);

