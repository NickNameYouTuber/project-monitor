# NIGIt Identity Provider API Documentation

## Обзор

NIGIt Identity Provider API позволяет организациям использовать корпоративную систему аутентификации для интеграции с внешними сервисами. Каждая организация может стать провайдером идентификации со своими учетными данными.

## Основные возможности

- Централизованная корпоративная аутентификация
- Привязка корпоративных учетных данных к пользовательским аккаунтам
- API для внешних интеграций
- Автоматическая синхронизация изменений пароля через webhooks
- Безопасное шифрование учетных данных (AES-256)

## Получение API ключей

### Шаг 1: Включить Identity Provider

Только владельцы организации могут включить режим Identity Provider:

```http
POST /api/organizations/{orgId}/identity-provider/enable
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "provider_name": "My Company SSO"
}
```

### Шаг 2: Сгенерировать API ключи

```http
POST /api/organizations/{orgId}/identity-provider/generate-keys
Authorization: Bearer {your_jwt_token}
```

Ответ:
```json
{
  "success": true,
  "api_key": "ipk_abc123...",
  "api_secret": "ips_xyz789...",
  "message": "API credentials generated successfully"
}
```

**Важно:** Сохраните API secret в безопасном месте. Он не будет показан повторно.

## Основные эндпоинты

### 1. Аутентификация пользователя

Аутентифицировать пользователя через корпоративные учетные данные:

```http
POST /api/identity-provider/authenticate
X-API-Key: ipk_abc123...
X-API-Secret: ips_xyz789...
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "user_corporate_password"
}
```

Успешный ответ:
```json
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "email": "user@company.com",
    "username": "john.doe",
    "verified": true
  }
}
```

Ошибка аутентификации:
```json
{
  "success": false,
  "message": "Authentication failed"
}
```

### 2. Получить информацию о пользователе

```http
GET /api/identity-provider/user-info?email=user@company.com
X-API-Key: ipk_abc123...
X-API-Secret: ips_xyz789...
```

### 3. Webhook для уведомлений

Ваш сервис может получать уведомления о событиях (например, смена пароля):

```http
POST {your_webhook_url}
Content-Type: application/json

{
  "event": "password_changed",
  "organization_id": "uuid",
  "email": "user@company.com",
  "timestamp": 1234567890
}
```

## Управление корпоративными учетными данными

### Привязать корпоративный аккаунт

Пользователи привязывают свои корпоративные учетные данные:

```http
POST /api/organizations/{orgId}/corporate-auth/link
Authorization: Bearer {user_jwt_token}
Content-Type: application/json

{
  "email": "user@company.com",
  "username": "john.doe",
  "password": "corporate_password"
}
```

### Проверить учетные данные

```http
POST /api/organizations/{orgId}/corporate-auth/verify
Authorization: Bearer {user_jwt_token}
Content-Type: application/json

{
  "password": "corporate_password"
}
```

### Изменить корпоративный пароль

```http
PUT /api/organizations/{orgId}/corporate-auth/password
Authorization: Bearer {user_jwt_token}
Content-Type: application/json

{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

### Отвязать корпоративный аккаунт

```http
DELETE /api/organizations/{orgId}/corporate-auth
Authorization: Bearer {user_jwt_token}
```

### Проверить статус привязки

```http
GET /api/organizations/{orgId}/corporate-auth/status
Authorization: Bearer {user_jwt_token}
```

Ответ:
```json
{
  "linked": true,
  "email": "user@company.com",
  "username": "john.doe",
  "verified": true,
  "last_verified_at": "2025-10-14T12:00:00Z"
}
```

## Управление конфигурацией провайдера

### Получить конфигурацию

```http
GET /api/organizations/{orgId}/identity-provider/config
Authorization: Bearer {your_jwt_token}
```

### Обновить конфигурацию

```http
PUT /api/organizations/{orgId}/identity-provider/config
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "provider_name": "Updated Name",
  "webhook_url": "https://your-service.com/webhook",
  "allowed_domains": "@company.com, @subsidiary.com",
  "require_email_verification": true
}
```

### Обновить API secret

```http
POST /api/organizations/{orgId}/identity-provider/rotate-secret
Authorization: Bearer {your_jwt_token}
```

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешно |
| 400 | Неверный запрос |
| 401 | Не авторизован / Неверные API ключи |
| 403 | Доступ запрещён |
| 404 | Ресурс не найден |
| 409 | Конфликт (например, аккаунт уже привязан) |
| 500 | Внутренняя ошибка сервера |

## Безопасность

### Шифрование

- Все пароли шифруются с использованием AES-256
- Каждая организация имеет свой уникальный encryption key
- API secrets хранятся в зашифрованном виде

### Рекомендации

1. Храните API ключи в безопасном месте (переменные окружения, секреты)
2. Используйте HTTPS для всех запросов
3. Регулярно ротируйте API secrets
4. Настройте webhook URL только для доверенных сервисов
5. Используйте allowed_domains для ограничения доступа

## Примеры интеграции

См. директорию `examples/` для примеров кода на различных языках:
- JavaScript/Node.js
- Python
- Java

## Поддержка

Для вопросов и поддержки: support@nigit.com

Swagger UI доступен по адресу: `/swagger-ui.html` (группа "identity-provider")

