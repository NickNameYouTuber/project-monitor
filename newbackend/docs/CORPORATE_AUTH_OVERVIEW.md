# Система корпоративной аутентификации NIGIt

## Обзор

NIGIt реализует систему корпоративной аутентификации, где каждая организация может работать как независимый Identity Provider. Это позволяет организациям:

- Использовать корпоративные учетные данные для доступа к организации
- Предоставлять API для аутентификации внешних сервисов
- Автоматически синхронизировать изменения учетных данных
- Безопасно хранить и управлять корпоративными аккаунтами

## Архитектура

### Модель данных

#### 1. CorporateCredential
Хранит привязанные корпоративные учетные данные пользователя для конкретной организации:
- `user_id` - ID основного пользователя
- `organization_id` - ID организации
- `corporate_email` - корпоративная почта
- `corporate_username` - корпоративный логин
- `encrypted_password` - зашифрованный пароль (AES-256)
- `is_verified` - статус верификации
- `last_verified_at` - последняя проверка

**Уникальность:** Один пользователь может иметь только одну привязку на организацию.

#### 2. IdentityProviderConfig
Конфигурация организации как Identity Provider:
- `organization_id` - ID организации
- `enabled` - активен ли провайдер
- `provider_name` - название провайдера
- `api_key` / `api_secret` - учетные данные для API
- `webhook_url` - URL для уведомлений
- `allowed_domains` - разрешенные email домены
- `require_email_verification` - требовать верификацию

### Компоненты системы

#### Backend (Java/Spring Boot)

**Сервисы:**
- `CorporateCredentialService` - управление корпоративными учетными данными
- `IdentityProviderService` - управление Identity Provider
- `EncryptionService` - шифрование/расшифровка паролей

**API Контроллеры:**
- `CorporateAuthController` - управление своими корп. учетными данными
- `IdentityProviderController` - публичный API для внешних сервисов
- `IdentityProviderManagementController` - настройка Identity Provider

**Репозитории:**
- `CorporateCredentialRepository` - доступ к учетным данным
- `IdentityProviderConfigRepository` - доступ к конфигурациям

#### Frontend (React/TypeScript)

**Компоненты:**
- `CorporateAuthDialog` - диалог привязки корпоративного аккаунта
- `IdentityProviderSettings` - настройки Identity Provider в организации

**API клиенты:**
- `corporate-auth.ts` - работа с корпоративными учетными данными
- `identity-provider.ts` - управление Identity Provider

## Потоки работы

### 1. Настройка организации как Identity Provider

1. Владелец организации заходит в Settings → Identity Provider
2. Нажимает "Enable Identity Provider"
3. Генерирует API ключи (появляются один раз!)
4. Настраивает webhook URL и allowed domains
5. Сохраняет конфигурацию

### 2. Пользователь привязывает корпоративный аккаунт

1. Пользователь выбирает организацию с `require_corporate_email=true`
2. Если аккаунт не привязан - открывается `CorporateAuthDialog`
3. Пользователь вводит корпоративные email и пароль
4. Система проверяет и шифрует учетные данные
5. Привязка сохраняется в БД
6. Пользователь получает доступ к организации

### 3. Внешний сервис использует Identity Provider

1. Сервис получает API ключи от организации
2. Отправляет запрос `/api/identity-provider/authenticate` с email/password
3. Получает информацию о пользователе при успехе
4. Использует webhook для получения уведомлений об изменениях

### 4. Смена корпоративного пароля

1. Пользователь заходит в Organizations → Settings → Corporate Auth
2. Вводит текущий и новый пароль
3. Система обновляет зашифрованный пароль
4. Отправляет webhook уведомление всем интегрированным сервисам

## Безопасность

### Шифрование

- **Алгоритм:** AES-256
- **Ключ:** Уникальный для каждой организации (производный от master key + org ID)
- **Хранение:** Пароли хранятся только в зашифрованном виде

### Права доступа

**Identity Provider настройки:**
- Включение/выключение - только OWNER
- Генерация API ключей - только OWNER
- Ротация secrets - только OWNER
- Просмотр конфигурации - OWNER и ADMIN

**Corporate Auth:**
- Привязка/отвязка аккаунта - сам пользователь
- Смена пароля - сам пользователь
- Проверка статуса - сам пользователь

### Рекомендации

1. **Master Key:** Установите переменную окружения `ENCRYPTION_MASTER_KEY` с сильным ключом
2. **API Secrets:** Храните в безопасном месте, они не показываются повторно
3. **HTTPS:** Всегда используйте HTTPS в продакшене
4. **Webhooks:** Проверяйте подпись webhook запросов
5. **Ротация:** Регулярно ротируйте API secrets

## API Документация

Полная документация доступна в:
- `IDENTITY_PROVIDER_API.md` - описание всех эндпоинтов
- Swagger UI: `/swagger-ui.html` (группа "identity-provider")

## Примеры использования

См. директорию `examples/`:
- `javascript-example.js` - Node.js/JavaScript
- `python-example.py` - Python
- `java-example.java` - Java

## База данных

### Таблицы

**corporate_credentials:**
- Хранит корпоративные учетные данные
- Индексы: user_id, organization_id, corporate_email
- UNIQUE constraint: (user_id, organization_id)

**identity_provider_configs:**
- Хранит конфигурацию Identity Provider
- Индексы: organization_id (unique), api_key (unique)

## Миграции

- **V38__create_corporate_credentials.sql** - создание таблиц и индексов

## Тестирование

### Локальное тестирование

1. Запустите backend: `mvn spring-boot:run`
2. Запустите frontend: `npm run dev`
3. Создайте организацию
4. Включите "Require Corporate Email" в настройках Security
5. Выйдите и попробуйте войти в организацию
6. Появится диалог привязки корпоративного аккаунта

### API тестирование

```bash
# Включить Identity Provider
curl -X POST https://your-instance/api/organizations/{orgId}/identity-provider/enable \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"provider_name": "Test Provider"}'

# Сгенерировать API ключи
curl -X POST https://your-instance/api/organizations/{orgId}/identity-provider/generate-keys \
  -H "Authorization: Bearer {token}"

# Аутентифицировать пользователя
curl -X POST https://your-instance/api/identity-provider/authenticate \
  -H "X-API-Key: ipk_..." \
  -H "X-API-Secret: ips_..." \
  -H "Content-Type: application/json" \
  -d '{"email": "user@company.com", "password": "password"}'
```

## Поддержка и вопросы

Для вопросов по интеграции обращайтесь: support@nigit.com

## Версионирование

Текущая версия: **1.0**

### Changelog

**1.0** (2025-10-14)
- Начальная реализация системы корпоративной аутентификации
- Поддержка Identity Provider API
- AES-256 шифрование
- Webhook уведомления
- Swagger документация

