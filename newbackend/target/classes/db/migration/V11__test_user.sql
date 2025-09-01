-- Добавляем тестового пользователя: test/test123
INSERT INTO users (id, username, password_hash, display_name, created_at) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'test',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',  -- BCrypt hash для "test123"
    'Test User',
    NOW()
) ON CONFLICT (username) DO NOTHING;
