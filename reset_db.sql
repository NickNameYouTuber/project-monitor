-- Полная очистка и заполнение БД тестовыми данными

-- Отключаем FK constraints для очистки
SET session_replication_role = replica;

-- Очищаем все таблицы
TRUNCATE TABLE whiteboard_elements, whiteboard_connections, whiteboards CASCADE;
TRUNCATE TABLE webhooks CASCADE;
TRUNCATE TABLE tokens CASCADE;
TRUNCATE TABLE task_assignees CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE task_columns CASCADE;
TRUNCATE TABLE sso_user_links, sso_states, sso_configurations CASCADE;
TRUNCATE TABLE runners CASCADE;
TRUNCATE TABLE repository_members CASCADE;
TRUNCATE TABLE pipeline_log_chunks, pipeline_artifacts, pipeline_jobs, pipelines, pipeline_schedules CASCADE;
TRUNCATE TABLE merge_request_notes, merge_request_discussions, merge_request_approvals, merge_requests CASCADE;
TRUNCATE TABLE ci_variables CASCADE;
TRUNCATE TABLE repositories CASCADE;
TRUNCATE TABLE project_members CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE dashboard_members CASCADE;
TRUNCATE TABLE dashboards CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE chat_messages, chats CASCADE;
TRUNCATE TABLE call_participants, calls CASCADE;
TRUNCATE TABLE organization_invites CASCADE;
TRUNCATE TABLE org_role_permissions, org_roles CASCADE;
TRUNCATE TABLE organization_members CASCADE;
TRUNCATE TABLE organizations CASCADE;
TRUNCATE TABLE users CASCADE;

-- Включаем FK constraints обратно
SET session_replication_role = DEFAULT;

-- Создаем пользователей
-- Пароль для всех: 'test123' -> bcrypt hash
INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'testuser1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Test User One', NOW()),
('22222222-2222-2222-2222-222222222222', 'testuser2', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Test User Two', NOW()),
('33333333-3333-3333-3333-333333333333', 'testuser3', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Test User Three', NOW());

-- Создаем организации
-- 1. Обычная организация (без пароля, без SSO)
INSERT INTO organizations (id, name, slug, description, require_password, password_hash, owner_id, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Open Organization', 'open-org', 'Organization without password or SSO', FALSE, NULL, '11111111-1111-1111-1111-111111111111', NOW(), NOW());

-- 2. Организация с паролем
-- Пароль: 'orgpass123' -> bcrypt hash
INSERT INTO organizations (id, name, slug, description, require_password, password_hash, owner_id, created_at, updated_at) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Password Protected Org', 'password-org', 'Organization with password protection', TRUE, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '22222222-2222-2222-2222-222222222222', NOW(), NOW());

-- 3. Организация с SSO
INSERT INTO organizations (id, name, slug, description, require_password, password_hash, owner_id, created_at, updated_at) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'SSO Organization', 'sso-org', 'Organization with SSO enabled', FALSE, NULL, '33333333-3333-3333-3333-333333333333', NOW(), NOW());

-- Добавляем SSO конфигурацию для третьей организации
INSERT INTO sso_configurations (
    id,
    organization_id,
    provider_type,
    enabled,
    require_sso,
    client_id,
    client_secret_encrypted,
    authorization_endpoint,
    token_endpoint,
    userinfo_endpoint,
    issuer,
    scopes
) VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'OIDC',
    TRUE,
    TRUE,
    'testcorp-sso-client',
    'testcorp-sso-secret-key-2026',  -- В реальности должно быть зашифровано
    'http://localhost:3900/authorize',
    'http://localhost:3900/token',
    'http://localhost:3900/userinfo',
    'http://localhost:3900',
    'openid,profile,email'
);

-- Добавляем участников в организации
INSERT INTO organization_members (id, organization_id, user_id, role, joined_at) VALUES
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'OWNER', NOW()),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'DEVELOPER', NOW()),
(gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'OWNER', NOW()),
(gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'DEVELOPER', NOW()),
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'OWNER', NOW()),
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'DEVELOPER', NOW());

-- Создаем dashboards для каждой организации
INSERT INTO dashboards (id, name, description, owner_id, created_at) VALUES
('d1111111-1111-1111-1111-111111111111', 'Open Org Dashboard', 'Dashboard for open organization', '11111111-1111-1111-1111-111111111111', NOW()),
('d2222222-2222-2222-2222-222222222222', 'Password Org Dashboard', 'Dashboard for password-protected org', '22222222-2222-2222-2222-222222222222', NOW()),
('d3333333-3333-3333-3333-333333333333', 'SSO Org Dashboard', 'Dashboard for SSO organization', '33333333-3333-3333-3333-333333333333', NOW());

-- Создаем проекты для каждой организации
-- Проекты в Open Organization
INSERT INTO projects (id, name, description, status, priority, owner_id, organization_id, dashboard_id, order_index, color, created_at) VALUES
('a1111111-1111-1111-1111-111111111111', 'Open Project Alpha', 'First project in open org', 'todo', 'high', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd1111111-1111-1111-1111-111111111111', 0, '#3b82f6', NOW()),
('a1111111-2222-2222-2222-222222222222', 'Open Project Beta', 'Second project in open org', 'in-progress', 'medium', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd1111111-1111-1111-1111-111111111111', 1, '#10b981', NOW()),
('a1111111-3333-3333-3333-333333333333', 'Open Project Gamma', 'Third project in open org', 'review', 'low', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd1111111-1111-1111-1111-111111111111', 2, '#f59e0b', NOW());

-- Проекты в Password-Protected Organization
INSERT INTO projects (id, name, description, status, priority, owner_id, organization_id, dashboard_id, order_index, color, created_at) VALUES
('a2222222-1111-1111-1111-111111111111', 'Secure Project One', 'First project in password org', 'todo', 'critical', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'd2222222-2222-2222-2222-222222222222', 0, '#ef4444', NOW()),
('a2222222-2222-2222-2222-222222222222', 'Secure Project Two', 'Second project in password org', 'in-progress', 'high', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'd2222222-2222-2222-2222-222222222222', 1, '#8b5cf6', NOW()),
('a2222222-3333-3333-3333-333333333333', 'Secure Project Three', 'Third project in password org', 'completed', 'medium', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'd2222222-2222-2222-2222-222222222222', 2, '#06b6d4', NOW());

-- Проекты в SSO Organization
INSERT INTO projects (id, name, description, status, priority, owner_id, organization_id, dashboard_id, order_index, color, created_at) VALUES
('a3333333-1111-1111-1111-111111111111', 'Enterprise Project X', 'First project in SSO org', 'todo', 'high', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'd3333333-3333-3333-3333-333333333333', 0, '#ec4899', NOW()),
('a3333333-2222-2222-2222-222222222222', 'Enterprise Project Y', 'Second project in SSO org', 'in-progress', 'high', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'd3333333-3333-3333-3333-333333333333', 1, '#14b8a6', NOW()),
('a3333333-3333-3333-3333-333333333333', 'Enterprise Project Z', 'Third project in SSO org', 'review', 'medium', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'd3333333-3333-3333-3333-333333333333', 2, '#f97316', NOW());

-- Создаем колонки задач для каждого проекта
-- Open Project Alpha
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c1111111-0000-0000-0000-000000000001', 'To Do', 'a1111111-1111-1111-1111-111111111111', 0, '#6b7280'),
('c1111111-0000-0000-0000-000000000002', 'In Progress', 'a1111111-1111-1111-1111-111111111111', 1, '#3b82f6'),
('c1111111-0000-0000-0000-000000000003', 'Review', 'a1111111-1111-1111-1111-111111111111', 2, '#f59e0b'),
('c1111111-0000-0000-0000-000000000004', 'Done', 'a1111111-1111-1111-1111-111111111111', 3, '#10b981');

-- Open Project Beta
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c2222222-0000-0000-0000-000000000001', 'Backlog', 'a1111111-2222-2222-2222-222222222222', 0, '#94a3b8'),
('c2222222-0000-0000-0000-000000000002', 'Development', 'a1111111-2222-2222-2222-222222222222', 1, '#8b5cf6'),
('c2222222-0000-0000-0000-000000000003', 'Testing', 'a1111111-2222-2222-2222-222222222222', 2, '#f43f5e'),
('c2222222-0000-0000-0000-000000000004', 'Deployed', 'a1111111-2222-2222-2222-222222222222', 3, '#22c55e');

-- Open Project Gamma
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c3333333-0000-0000-0000-000000000001', 'New', 'a1111111-3333-3333-3333-333333333333', 0, '#cbd5e1'),
('c3333333-0000-0000-0000-000000000002', 'Active', 'a1111111-3333-3333-3333-333333333333', 1, '#06b6d4'),
('c3333333-0000-0000-0000-000000000003', 'Blocked', 'a1111111-3333-3333-3333-333333333333', 2, '#dc2626'),
('c3333333-0000-0000-0000-000000000004', 'Complete', 'a1111111-3333-3333-3333-333333333333', 3, '#84cc16');

-- Secure Project One
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c4444444-0000-0000-0000-000000000001', 'To Do', 'a2222222-1111-1111-1111-111111111111', 0, '#64748b'),
('c4444444-0000-0000-0000-000000000002', 'WIP', 'a2222222-1111-1111-1111-111111111111', 1, '#3b82f6'),
('c4444444-0000-0000-0000-000000000003', 'QA', 'a2222222-1111-1111-1111-111111111111', 2, '#eab308'),
('c4444444-0000-0000-0000-000000000004', 'Done', 'a2222222-1111-1111-1111-111111111111', 3, '#16a34a');

-- Secure Project Two
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c5555555-0000-0000-0000-000000000001', 'Queue', 'a2222222-2222-2222-2222-222222222222', 0, '#78716c'),
('c5555555-0000-0000-0000-000000000002', 'Coding', 'a2222222-2222-2222-2222-222222222222', 1, '#6366f1'),
('c5555555-0000-0000-0000-000000000003', 'Code Review', 'a2222222-2222-2222-2222-222222222222', 2, '#a855f7'),
('c5555555-0000-0000-0000-000000000004', 'Merged', 'a2222222-2222-2222-2222-222222222222', 3, '#059669');

-- Secure Project Three
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c6666666-0000-0000-0000-000000000001', 'Planning', 'a2222222-3333-3333-3333-333333333333', 0, '#9ca3af'),
('c6666666-0000-0000-0000-000000000002', 'Execution', 'a2222222-3333-3333-3333-333333333333', 1, '#0ea5e9'),
('c6666666-0000-0000-0000-000000000003', 'Verification', 'a2222222-3333-3333-3333-333333333333', 2, '#f97316'),
('c6666666-0000-0000-0000-000000000004', 'Shipped', 'a2222222-3333-3333-3333-333333333333', 3, '#10b981');

-- Enterprise Project X
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c7777777-0000-0000-0000-000000000001', 'Ideas', 'a3333333-1111-1111-1111-111111111111', 0, '#d1d5db'),
('c7777777-0000-0000-0000-000000000002', 'Sprint', 'a3333333-1111-1111-1111-111111111111', 1, '#2563eb'),
('c7777777-0000-0000-0000-000000000003', 'Staging', 'a3333333-1111-1111-1111-111111111111', 2, '#fb923c'),
('c7777777-0000-0000-0000-000000000004', 'Production', 'a3333333-1111-1111-1111-111111111111', 3, '#65a30d');

-- Enterprise Project Y
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c8888888-0000-0000-0000-000000000001', 'Draft', 'a3333333-2222-2222-2222-222222222222', 0, '#a8a29e'),
('c8888888-0000-0000-0000-000000000002', 'Building', 'a3333333-2222-2222-2222-222222222222', 1, '#7c3aed'),
('c8888888-0000-0000-0000-000000000003', 'Testing', 'a3333333-2222-2222-2222-222222222222', 2, '#ea580c'),
('c8888888-0000-0000-0000-000000000004', 'Live', 'a3333333-2222-2222-2222-222222222222', 3, '#15803d');

-- Enterprise Project Z
INSERT INTO task_columns (id, name, project_id, order_index, color) VALUES
('c9999999-0000-0000-0000-000000000001', 'Inbox', 'a3333333-3333-3333-3333-333333333333', 0, '#71717a'),
('c9999999-0000-0000-0000-000000000002', 'Active Sprint', 'a3333333-3333-3333-3333-333333333333', 1, '#4f46e5'),
('c9999999-0000-0000-0000-000000000003', 'UAT', 'a3333333-3333-3333-3333-333333333333', 2, '#d97706'),
('c9999999-0000-0000-0000-000000000004', 'Released', 'a3333333-3333-3333-3333-333333333333', 3, '#047857');

-- Создаем задачи (по 4-6 задач на проект)
-- Open Project Alpha tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000001', 'Setup project infrastructure', 'Initialize repo, CI/CD, and cloud resources', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000001', 'Design database schema', 'Create ER diagram and migration scripts', 1, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000002', 'Implement authentication', 'JWT-based auth with refresh tokens', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000003', 'Add unit tests for auth', 'Cover all auth endpoints with tests', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'c1111111-0000-0000-0000-000000000004', 'Create README.md', 'Document setup and usage', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW());

-- Open Project Beta tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a1111111-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000001', 'Research UI framework', 'Compare React, Vue, Svelte', 0, NULL, NOW(), NOW()),
(gen_random_uuid(), 'a1111111-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000001', 'Plan sprint 1', 'Define MVP features', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000002', 'Build landing page', 'Hero section + feature cards', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000003', 'E2E tests for signup flow', 'Playwright tests', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000004', 'Deploy to staging', 'Push v0.1.0 to staging env', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-2222-2222-2222-222222222222', 'c2222222-0000-0000-0000-000000000004', 'Setup monitoring', 'Grafana + Prometheus', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW());

-- Open Project Gamma tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a1111111-3333-3333-3333-333333333333', 'c3333333-0000-0000-0000-000000000001', 'API rate limiting', 'Implement per-user rate limits', 0, NULL, NOW(), NOW()),
(gen_random_uuid(), 'a1111111-3333-3333-3333-333333333333', 'c3333333-0000-0000-0000-000000000002', 'WebSocket connection pooling', 'Optimize real-time connections', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-3333-3333-3333-333333333333', 'c3333333-0000-0000-0000-000000000002', 'Notification system', 'Email + push notifications', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-3333-3333-3333-333333333333', 'c3333333-0000-0000-0000-000000000003', 'SSO integration', 'Waiting for SAML cert from IT', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a1111111-3333-3333-3333-333333333333', 'c3333333-0000-0000-0000-000000000004', 'Docker compose setup', 'Full dev environment', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW());

-- Secure Project One tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a2222222-1111-1111-1111-111111111111', 'c4444444-0000-0000-0000-000000000001', 'Security audit', 'Third-party penetration test', 0, NULL, NOW(), NOW()),
(gen_random_uuid(), 'a2222222-1111-1111-1111-111111111111', 'c4444444-0000-0000-0000-000000000001', 'Encrypt sensitive data', 'At-rest encryption for PII', 1, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-1111-1111-1111-111111111111', 'c4444444-0000-0000-0000-000000000002', 'Implement 2FA', 'TOTP + backup codes', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-1111-1111-1111-111111111111', 'c4444444-0000-0000-0000-000000000003', 'Test password reset flow', 'All edge cases', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-1111-1111-1111-111111111111', 'c4444444-0000-0000-0000-000000000004', 'GDPR compliance docs', 'Data processing agreements', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW());

-- Secure Project Two tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'c5555555-0000-0000-0000-000000000001', 'Refactor payment logic', 'Move to Stripe SDK v3', 0, NULL, NOW(), NOW()),
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'c5555555-0000-0000-0000-000000000002', 'Add invoice generation', 'PDF templates', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'c5555555-0000-0000-0000-000000000002', 'Subscription cancellation flow', 'Retain users with offers', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'c5555555-0000-0000-0000-000000000003', 'API docs update', 'OpenAPI 3.1 spec', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'c5555555-0000-0000-0000-000000000004', 'Webhook retry logic', 'Exponential backoff', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'c5555555-0000-0000-0000-000000000004', 'Customer dashboard v2', 'Material Design 3', 1, '22222222-2222-2222-2222-222222222222', NOW(), NOW());

-- Secure Project Three tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a2222222-3333-3333-3333-333333333333', 'c6666666-0000-0000-0000-000000000001', 'Q2 roadmap planning', 'Feature prioritization', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-3333-3333-3333-333333333333', 'c6666666-0000-0000-0000-000000000002', 'Mobile app prototype', 'React Native POC', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-3333-3333-3333-333333333333', 'c6666666-0000-0000-0000-000000000002', 'GraphQL migration', 'Replace REST with GQL', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-3333-3333-3333-333333333333', 'c6666666-0000-0000-0000-000000000003', 'Load testing', '10k concurrent users', 0, '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
(gen_random_uuid(), 'a2222222-3333-3333-3333-333333333333', 'c6666666-0000-0000-0000-000000000004', 'Release notes v1.0', 'User-facing changelog', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW());

-- Enterprise Project X tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a3333333-1111-1111-1111-111111111111', 'c7777777-0000-0000-0000-000000000001', 'AI-powered search', 'Semantic search with embeddings', 0, NULL, NOW(), NOW()),
(gen_random_uuid(), 'a3333333-1111-1111-1111-111111111111', 'c7777777-0000-0000-0000-000000000001', 'Multi-tenant architecture', 'Isolated customer data', 1, NULL, NOW(), NOW()),
(gen_random_uuid(), 'a3333333-1111-1111-1111-111111111111', 'c7777777-0000-0000-0000-000000000002', 'SSO integration', 'OIDC with Azure AD', 0, '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-1111-1111-1111-111111111111', 'c7777777-0000-0000-0000-000000000003', 'Performance optimization', 'Redis caching layer', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-1111-1111-1111-111111111111', 'c7777777-0000-0000-0000-000000000004', 'Analytics dashboard', 'Metabase integration', 0, '33333333-3333-3333-3333-333333333333', NOW(), NOW());

-- Enterprise Project Y tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a3333333-2222-2222-2222-222222222222', 'c8888888-0000-0000-0000-000000000001', 'Technical RFC', 'Microservices migration plan', 0, '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-2222-2222-2222-222222222222', 'c8888888-0000-0000-0000-000000000002', 'Kubernetes deployment', 'Helm charts + ArgoCD', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-2222-2222-2222-222222222222', 'c8888888-0000-0000-0000-000000000002', 'Service mesh setup', 'Istio configuration', 1, '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-2222-2222-2222-222222222222', 'c8888888-0000-0000-0000-000000000003', 'Chaos engineering', 'Test failure scenarios', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-2222-2222-2222-222222222222', 'c8888888-0000-0000-0000-000000000004', 'CDN integration', 'Cloudflare setup', 0, '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-2222-2222-2222-222222222222', 'c8888888-0000-0000-0000-000000000004', 'Global deployment', 'Multi-region active-active', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW());

-- Enterprise Project Z tasks
INSERT INTO tasks (id, project_id, column_id, title, description, order_index, assignee_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'a3333333-3333-3333-3333-333333333333', 'c9999999-0000-0000-0000-000000000001', 'Compliance review', 'SOC2 Type II prep', 0, NULL, NOW(), NOW()),
(gen_random_uuid(), 'a3333333-3333-3333-3333-333333333333', 'c9999999-0000-0000-0000-000000000002', 'Data warehouse ETL', 'Airflow DAGs', 0, '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-3333-3333-3333-333333333333', 'c9999999-0000-0000-0000-000000000002', 'Machine learning pipeline', 'Model training automation', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-3333-3333-3333-333333333333', 'c9999999-0000-0000-0000-000000000003', 'Business intelligence reports', 'Executive dashboards', 0, '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
(gen_random_uuid(), 'a3333333-3333-3333-3333-333333333333', 'c9999999-0000-0000-0000-000000000004', 'Product launch campaign', 'Marketing materials', 0, NULL, NOW(), NOW());

-- Вывод результатов
SELECT 'Database reset complete!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as org_count FROM organizations;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as task_column_count FROM task_columns;
SELECT COUNT(*) as task_count FROM tasks;

