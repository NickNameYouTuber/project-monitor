# Настройка .env файлов на Production

## Где создавать .env файлы

На production окружении нужно создать следующие .env файлы:

### 1. `services/nimeet-backend/.env` (ОБЯЗАТЕЛЬНО)

**Путь:** `services/nimeet-backend/.env`

**Содержимое:**
```env
PORT=4000
MONGODB_URI=mongodb://nimeet:nimeetpass@mongo:27017/nimeet
REDIS_URL=redis://:nimeet_redis_pass@redis:6379
USE_MEDIASOUP=true
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-key
CLIENT_URL=https://your-domain.com
```

**Важно:** Этот файл используется через `env_file` в docker-compose.yml (строка 100-101), поэтому он обязателен.

### 2. `front/.env` (для переменных VITE_*)

**Путь:** `front/.env`

**Содержимое:**
```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com:4000
VITE_TELEGRAM_BOT_NAME=your_bot_name
VITE_TURN_URL=turn:your-domain.com:3478
VITE_TURN_USER=your_turn_username
VITE_TURN_PASS=your_turn_password
```

### 2.1. `whiteboard-frontend/.env.local` (для Gemini AI)

**Путь:** `whiteboard-frontend/.env.local`

**Содержимое:**
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

**Важно:**
- Этот ключ используется для AI функций в whiteboard (генерация диаграмм, брейншторм)
- Получите ключ на https://makersuite.google.com/app/apikey
- Без этого ключа AI функции в whiteboard не будут работать

**Важно:** 
- Эти переменные используются при **сборке** фронтенда (build time)
- После сборки они встраиваются в код
- Если нужно изменить после сборки, нужно пересобрать образ

### 3. `.env` в корне проекта (опционально, для docker-compose)

**Путь:** `.env` (в корне проекта, рядом с docker-compose.yml)

**Содержимое:**
```env
PUBLIC_IP=your-public-ip-address
POSTGRES_PASSWORD=your-secure-postgres-password
JWT_SECRET=your-secure-jwt-secret-key
REDIS_PASSWORD=your-secure-redis-password
MONGO_PASSWORD=your-secure-mongo-password
```

**Использование:** Эти переменные можно использовать в docker-compose.yml через `${VARIABLE_NAME}`.

**Пример в docker-compose.yml:**
```yaml
mediasoup-server:
  environment:
    - ANNOUNCED_IP=${PUBLIC_IP:-127.0.0.1}  # Использует PUBLIC_IP из .env
```

### 4. Переменные в docker-compose.yml (текущий подход)

Сейчас большинство переменных заданы напрямую в `docker-compose.yml` через секцию `environment:`. 

**Для production рекомендуется:**

1. **Вариант А:** Оставить переменные в docker-compose.yml, но заменить все значения по умолчанию на безопасные
2. **Вариант Б:** Вынести чувствительные данные в `.env` файл в корне и использовать `${VARIABLE}` в docker-compose.yml

## Рекомендуемая структура для Production

```
project-monitor/
├── .env                          # Общие переменные для docker-compose
├── docker-compose.yml
├── front/
│   └── .env                     # Переменные для сборки фронтенда
├── whiteboard-frontend/
│   └── .env.local              # Gemini API ключ для whiteboard AI
└── services/
    └── nimeet-backend/
        └── .env                 # Переменные для nimeet-backend
```

## AI/ИИ переменные - где настраивать

### 1. Backend AI (GPTunnel) - для чатов и AI ассистента

**Где:** В `docker-compose.yml` в секции `backend.environment`:

```yaml
backend:
  environment:
    - GPTUNNEL_BASE_URL=https://gptunnel.com/v1
    - GPTUNNEL_API_KEY=your-gptunnel-api-key  # ОБЯЗАТЕЛЬНО заменить!
    - LLM_MODEL=gpt-4o
```

**Альтернатива:** Можно задать в `newbackend/src/main/resources/application.yml`:

```yaml
gptunnel:
  base-url: ${GPTUNNEL_BASE_URL:https://gptunnel.com/v1}
  api-key: ${GPTUNNEL_API_KEY:your-key-here}
  model: ${LLM_MODEL:gpt-4o}
```

**Где получить ключ:** https://gptunnel.com

### 2. Whiteboard AI (Gemini) - для генерации диаграмм

**Где:** `whiteboard-frontend/.env.local`

```env
GEMINI_API_KEY=your-gemini-api-key
```

**Где получить ключ:** https://makersuite.google.com/app/apikey

**Важно:** 
- Этот файл используется при сборке whiteboard-frontend
- После изменения нужно пересобрать образ: `docker-compose build whiteboard-frontend`

## Что нужно изменить в docker-compose.yml для production

### Backend (newbackend) - AI переменные
Замените значения в секции `environment:`:

```yaml
backend:
  environment:
    - JWT_SECRET=your-secure-secret-key-256-bits-minimum
    - POSTGRES_PASSWORD=your-secure-password
    # AI/LLM переменные (GPTunnel)
    - GPTUNNEL_BASE_URL=https://gptunnel.com/v1
    - GPTUNNEL_API_KEY=your-gptunnel-api-key  # ОБЯЗАТЕЛЬНО заменить!
    - LLM_MODEL=gpt-4o  # или другой модель (gpt-4, gpt-3.5-turbo и т.д.)
```

**Важно:** 
- `GPTUNNEL_API_KEY` используется для работы AI ассистента в чатах
- Без этого ключа AI функции не будут работать
- Получите ключ на https://gptunnel.com

### Database
```yaml
db:
  environment:
    - POSTGRES_PASSWORD=your-secure-password  # ОБЯЗАТЕЛЬНО изменить!
```

### MongoDB
```yaml
mongo:
  environment:
    - MONGO_INITDB_ROOT_PASSWORD=your-secure-password  # ОБЯЗАТЕЛЬНО изменить!
```

### Redis
```yaml
redis:
  command: redis-server --requirepass your-secure-redis-password  # ОБЯЗАТЕЛЬНО изменить!
```

И обновите `REDIS_URL` в:
- `services/nimeet-backend/.env`
- `mediasoup-server` environment в docker-compose.yml

### MediaSoup Server
```yaml
mediasoup-server:
  environment:
    - ANNOUNCED_IP=${PUBLIC_IP}  # Используйте реальный публичный IP
    - ALLOWED_ORIGINS=https://your-domain.com,https://meet.your-domain.com
```

### Gitea
```yaml
git-http:
  environment:
    - GITEA__server__DOMAIN=your-domain.com
    - GITEA__server__ROOT_URL=https://your-domain.com:7681/
```

## Безопасность

1. **Никогда не коммитьте .env файлы в git!** (они уже в .gitignore)
2. Используйте сильные пароли (минимум 16 символов, смешанный регистр, цифры, символы)
3. Для JWT_SECRET используйте минимум 256 бит (32 символа)
4. Храните .env файлы в безопасном месте на сервере
5. Используйте разные пароли для разных сервисов
6. Рассмотрите использование Docker Secrets или внешних систем управления секретами (HashiCorp Vault, AWS Secrets Manager)

## Проверка после настройки

1. Убедитесь, что все .env файлы созданы
2. Проверьте, что все пароли изменены с дефолтных значений
3. Запустите: `docker-compose config` - проверит синтаксис и подставит переменные
4. Запустите: `docker-compose up -d`
5. Проверьте логи: `docker-compose logs`

## Пример полной настройки

```bash
# 1. Создать .env в корне
cat > .env << EOF
PUBLIC_IP=203.0.113.1
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
MONGO_PASSWORD=$(openssl rand -base64 32)
EOF

# 2. Создать front/.env
cat > front/.env << EOF
VITE_API_BASE_URL=https://app.example.com/api
VITE_SOCKET_URL=https://app.example.com:4000
VITE_TELEGRAM_BOT_NAME=your_bot_name
EOF

# 2.1. Создать whiteboard-frontend/.env.local (для Gemini AI)
cat > whiteboard-frontend/.env.local << EOF
GEMINI_API_KEY=your-gemini-api-key-here
EOF

# 3. Создать services/nimeet-backend/.env
cat > services/nimeet-backend/.env << EOF
PORT=4000
MONGODB_URI=mongodb://nimeet:${MONGO_PASSWORD}@mongo:27017/nimeet
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
USE_MEDIASOUP=true
NODE_ENV=production
EOF
```

**Важно:** Замените все примеры значений на реальные для вашего окружения!

## Проверка AI переменных

### Проверка GPTunnel (Backend)
После запуска проверьте логи backend:
```bash
docker logs project-monitor-backend | grep -i gptunnel
```

Если видите ошибки авторизации - проверьте `GPTUNNEL_API_KEY`.

### Проверка Gemini (Whiteboard)
1. Откройте whiteboard в браузере
2. Попробуйте использовать AI функции (генерация диаграмм, брейншторм)
3. Если не работает - проверьте консоль браузера на ошибки
4. Убедитесь, что `.env.local` создан и содержит правильный `GEMINI_API_KEY`
