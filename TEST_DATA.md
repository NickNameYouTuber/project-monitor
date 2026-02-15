# Тестовые данные для Project Monitor

База данных полностью очищена и заполнена тестовыми данными.

## Пользователи

Все пользователи имеют пароль: **test123**

| Username | Display Name | ID |
|----------|--------------|-----|
| testuser1 | Test User One | 11111111-1111-1111-1111-111111111111 |
| testuser2 | Test User Two | 22222222-2222-2222-2222-222222222222 |
| testuser3 | Test User Three | 33333333-3333-3333-3333-333333333333 |

## Пользователи NIID (Identity Provider)

Те же тестовые пользователи созданы в NIID для аутентификации email/пароль:

| Email | Name | Password | ID | Status |
|-------|------|----------|-----|--------|
| testuser1@example.com | Test User One | test123 | 3 | Active, Verified |
| testuser2@example.com | Test User Two | test123 | 4 | Active, Verified |
| testuser3@example.com | Test User Three | test123 | 5 | Active, Verified |

**NIID Database:** niid_db (PostgreSQL на порту 11709)  
**Bcrypt Hash (rounds=12):** `$2b$12$ltevuQYt2GxWX15pFzjzI.VcfoCb/LLgVKkCX1bYeIwmNzWJFVebu`

### Аутентификация через NIID

Auth Service проксирует запросы в User Service:
- **Auth Service:** http://localhost:11702 (контейнер niid-auth-service)
- **User Service:** http://localhost:11701 (контейнер niid-user-service)
- **API Gateway:** http://localhost:11700 (контейнер niid-api-gateway)

#### Примеры использования API

**1. Логин (получение токенов):**
```bash
POST http://localhost:11702/auth/login
Content-Type: application/json

{
  "email": "testuser1@example.com",
  "password": "test123"
}

# Ответ:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**2. Получение информации о пользователе:**
```bash
GET http://localhost:11701/api/users/me
Authorization: Bearer <access_token>

# Ответ:
{
  "id": 3,
  "email": "testuser1@example.com",
  "name": "Test User One",
  "phone": null,
  "is_active": true,
  "is_verified": true,
  "created_at": "2026-02-12T01:52:45.498531Z",
  "updated_at": "2026-02-12T01:52:45.498531Z"
}
```

**3. PowerShell тест:**
```powershell
# Логин
$body = @{email='testuser1@example.com'; password='test123'} | ConvertTo-Json
$auth = Invoke-RestMethod -Uri 'http://localhost:11702/auth/login' -Method POST `
  -Headers @{'Content-Type'='application/json'} -Body $body

# Получить инфо о пользователе
$user = Invoke-RestMethod -Uri 'http://localhost:11701/api/users/me' -Method GET `
  -Headers @{'Authorization'="Bearer $($auth.access_token)"}
```

✅ **Статус:** Все 3 тестовых пользователя успешно проходят аутентификацию

## Организации

### 1. Open Organization (без пароля, без SSO)
- **Slug:** `open-org`
- **ID:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- **Owner:** testuser1
- **Участники:** testuser1 (OWNER), testuser2 (DEVELOPER)
- **Проекты:**
  - Open Project Alpha (status: todo) — 4 колонки, 5 задач
  - Open Project Beta (status: in-progress) — 4 колонки, 6 задач
  - Open Project Gamma (status: review) — 4 колонки, 5 задач

### 2. Password Protected Org (с паролем)
- **Slug:** `password-org`
- **ID:** `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
- **Пароль организации:** **orgpass123**
- **Owner:** testuser2
- **Участники:** testuser2 (OWNER), testuser1 (DEVELOPER)
- **Проекты:**
  - Secure Project One (status: todo) — 4 колонки, 5 задач
  - Secure Project Two (status: in-progress) — 4 колонки, 6 задач
  - Secure Project Three (status: completed) — 4 колонки, 5 задач

### 3. SSO Organization (с SSO)
- **Slug:** `sso-org`
- **ID:** `cccccccc-cccc-cccc-cccc-cccccccccccc`
- **Owner:** testuser3
- **Участники:** testuser3 (OWNER), testuser1 (DEVELOPER)
- **SSO Provider:** TestCorp Identity (OIDC)
  - URL: http://localhost:3900
  - Client ID: testcorp-sso-client
  - Client Secret: testcorp-sso-secret-key-2026
- **SSO Тестовые аккаунты:**
  - admin@testcorp.local / admin123
  - dev@testcorp.local / dev123
  - user@testcorp.local / user123
- **Проекты:**
  - Enterprise Project X (status: todo) — 4 колонки, 5 задач
  - Enterprise Project Y (status: in-progress) — 4 колонки, 6 задач
  - Enterprise Project Z (status: review) — 4 колонки, 5 задач

## Детали проектов

Каждый проект содержит:
- **4 колонки задач** с разными названиями (To Do, In Progress, Review, Done и вариации)
- **5-6 задач**, распределенных по колонкам
- Задачи имеют:
  - Название
  - Описание
  - Исполнителя (assignee) или NULL для нераспределенных
  - Порядковый индекс (order_index)

## Статистика

- **Пользователей:** 3
- **Организаций:** 3
- **Проектов:** 9
- **Колонок задач:** 36
- **Задач:** 48

## Быстрый доступ

### Войти в Open Organization
1. Логин: testuser1 / test123
2. Перейти на http://localhost:7670
3. Выбрать организацию "Open Organization"
4. Доступ без дополнительной авторизации

### Войти в Password Protected Org
1. Логин: testuser2 / test123
2. Выбрать "Password Protected Org"
3. Ввести пароль организации: **orgpass123**
4. Перейти к проектам

### Войти в SSO Organization
1. Логин: testuser3 / test123
2. Выбрать "SSO Organization"
3. Будет редирект на http://localhost:3900 (TestCorp Identity)
4. Войти с любым SSO аккаунтом (например, admin@testcorp.local / admin123)
5. После успешной авторизации — доступ к проектам

## Примечания

- Все bcrypt хэши паролей используют соль $2a$10$
- Пароль пользователей (test123) и пароль организации (orgpass123) зашифрованы bcrypt
- SSO secret в боевом окружении должен быть зашифрован, сейчас хранится открытым текстом
- Организации, проекты и задачи созданы с реалистичными названиями и описаниями
- Timestamp всех записей — текущее время создания
