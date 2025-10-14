UPDATE repository_members SET role = 
    CASE 
        WHEN LOWER(role) = 'owner' THEN 'OWNER'
        WHEN LOWER(role) = 'developer' THEN 'DEVELOPER'
        WHEN LOWER(role) = 'maintainer' THEN 'MAINTAINER'
        WHEN LOWER(role) = 'reporter' THEN 'REPORTER'
        WHEN LOWER(role) = 'viewer' THEN 'VIEWER'
        ELSE 'VIEWER'
    END;

