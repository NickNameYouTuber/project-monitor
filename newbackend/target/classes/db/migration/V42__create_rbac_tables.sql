CREATE TABLE org_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7),
    is_system_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_organization_role_name UNIQUE(organization_id, name)
);

CREATE TABLE org_role_permissions (
    role_id UUID NOT NULL REFERENCES org_roles(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- Organization Members updates (nullable role_id for migration)
ALTER TABLE organization_members ADD COLUMN role_id UUID REFERENCES org_roles(id);

-- Organization Invites updates
ALTER TABLE organization_invites ADD COLUMN role_id UUID REFERENCES org_roles(id);
