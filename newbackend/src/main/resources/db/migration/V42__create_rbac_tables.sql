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

-- Organization Members updates
-- 1. Add new column as nullable first
ALTER TABLE organization_members ADD COLUMN role_id UUID REFERENCES org_roles(id);

-- 2. Migrate existing data (Optional/Advanced: Create default roles for existing orgs via script or code on startup)
-- For now, we make sure that NEW inserts (via code) will fill role_id.
-- But the "role" column (varchar) still exists and has NOT NULL constraint.
-- If code stops writing to "role", inserts fail.

-- We should loosen the constraint on the old "role" column if we plan to stop using it.
ALTER TABLE organization_members ALTER COLUMN role DROP NOT NULL;

-- Organization Invites updates
ALTER TABLE organization_invites ADD COLUMN role_id UUID REFERENCES org_roles(id);
ALTER TABLE organization_invites ALTER COLUMN role DROP NOT NULL;
