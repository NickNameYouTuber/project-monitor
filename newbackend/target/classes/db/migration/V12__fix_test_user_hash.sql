-- Обновляем хэш пароля для тестового пользователя с правильно сгенерированным BCrypt хэшем
UPDATE users 
SET password_hash = '$2a$10$vjYqzl8EG2qcbM7ipGKevOAX8bRsOeF9kGEaiVIDcjMMY0rGYOy5y'
WHERE username = 'test';
