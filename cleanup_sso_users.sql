-- Cleanup script for SSO-created users
-- Run this to remove SSO users created before the fix

-- 1. Find SSO users (users created via SSO with company emails)
SELECT id, username, display_name, created_at 
FROM users 
WHERE username LIKE '%@company.%' 
   OR username LIKE '%@corp.%'
ORDER BY created_at DESC;

-- 2. Remove SSO user links for these users
-- DELETE FROM sso_user_links 
-- WHERE user_id IN (
--     SELECT id FROM users WHERE username LIKE '%@company.%' OR username LIKE '%@corp.%'
-- );

-- 3. Remove organization memberships for these users
-- DELETE FROM organization_members 
-- WHERE user_id IN (
--     SELECT id FROM users WHERE username LIKE '%@company.%' OR username LIKE '%@corp.%'
-- );

-- 4. Remove the SSO users themselves
-- DELETE FROM users 
-- WHERE username LIKE '%@company.%' OR username LIKE '%@corp.%';

-- IMPORTANT: Uncomment the DELETE statements above only after verifying 
-- that these are indeed SSO-created users and not legitimate accounts!

