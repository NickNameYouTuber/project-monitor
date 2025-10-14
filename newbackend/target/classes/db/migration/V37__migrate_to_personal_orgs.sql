INSERT INTO organizations (id, name, slug, owner_id, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    COALESCE(u.display_name, u.username) || '''s Workspace',
    'personal-' || u.id::text,
    u.id,
    'Personal workspace for ' || COALESCE(u.display_name, u.username),
    NOW(),
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM organizations o WHERE o.owner_id = u.id AND o.slug LIKE 'personal-%'
);

INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
SELECT 
    gen_random_uuid(),
    o.id,
    o.owner_id,
    'OWNER',
    o.created_at
FROM organizations o
WHERE o.slug LIKE 'personal-%'
AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = o.id AND om.user_id = o.owner_id
);

UPDATE projects p
SET organization_id = (
    SELECT o.id 
    FROM organizations o 
    WHERE o.owner_id = p.owner_id 
    AND o.slug LIKE 'personal-%'
    LIMIT 1
)
WHERE p.organization_id IS NULL;

