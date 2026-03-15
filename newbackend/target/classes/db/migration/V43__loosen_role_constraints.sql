-- Loosen constraints on legacy role columns to allow transition to new RBAC system
ALTER TABLE organization_members ALTER COLUMN role DROP NOT NULL;
ALTER TABLE organization_invites ALTER COLUMN role DROP NOT NULL;
