# Настройка Telegram Login Widget

## Шаг 1: Создание и настройка бота
1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`, чтобы создать нового бота
3. Следуйте инструкциям, указав имя и username для бота
4. После создания бота **сохраните токен бота** - он понадобится для конфигурации
5. Отправьте команду `/setdomain` и выберите созданного бота
6. Укажите домен, на котором будет работать ваше приложение (например, `localhost`)

## Шаг 2: Настройка бэкенда
1. Откройте файл `backend/.env` и заполните следующие параметры:
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ # токен от BotFather
TELEGRAM_BOT_NAME=YourBotName # имя бота БЕЗ символа @
SECRET_KEY=YOUR_SUPER_SECRET_KEY_REPLACE_IN_PRODUCTION
```

## Шаг 3: Настройка фронтенда
1. Откройте файл `frontend/.env` и заполните:
```bash
VITE_TELEGRAM_BOT_NAME=YourBotName # то же имя бота, что и в бэкенде
VITE_API_URL=http://localhost:7671/api
```

## Шаг 4: Перезапустите приложение
```bash
docker-compose down && docker-compose up -d
```

## Возможные проблемы
- Если виджет не появляется, проверьте, загружается ли скрипт Telegram.
- Если авторизация не проходит, проверьте корректность токена бота.
- Если бэкенд выдаёт ошибку, проверьте логи контейнера с бэкендом.
