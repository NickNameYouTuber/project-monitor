# NIMeet Backend

Backend для видеозвон приложения NIMeet на Node.js с Express, Socket.io и MongoDB.

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните переменные:
- `PORT` - порт сервера (по умолчанию 5000)
- `MONGODB_URI` - строка подключения к MongoDB
- `JWT_SECRET` - секретный ключ для JWT токенов
- `CLIENT_URL` - URL frontend приложения
- `NODE_ENV` - окружение (development/production)

### 3. Запуск MongoDB

Убедитесь что MongoDB запущен локально или используйте MongoDB Atlas.

Локальный запуск:
```bash
mongod
```

### 4. Запуск сервера

Режим разработки (с auto-reload):
```bash
npm run dev
```

Обычный режим:
```bash
npm start
```

Сервер будет доступен на `http://localhost:5000`

## API Endpoints

### Аутентификация

- `POST /api/auth/register` - регистрация нового пользователя
  ```json
  {
    "username": "user",
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/login` - вход пользователя
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - получение текущего пользователя (требуется токен)

### Комнаты

- `POST /api/rooms/create` - создание новой комнаты (требуется токен)
- `GET /api/rooms/:roomId` - получение информации о комнате

## Socket.io Events

### Client -> Server

- `join-room` - присоединение к комнате
- `leave-room` - выход из комнаты
- `offer` - отправка WebRTC offer
- `answer` - отправка WebRTC answer
- `ice-candidate` - отправка ICE candidate
- `toggle-media` - изменение состояния медиа (камера/микрофон/экран)

### Server -> Client

- `user-joined` - новый пользователь присоединился
- `user-left` - пользователь покинул комнату
- `receive-offer` - получен offer
- `receive-answer` - получен answer
- `receive-ice-candidate` - получен ICE candidate
- `media-toggled` - пользователь изменил состояние медиа

## Структура проекта

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Конфигурация MongoDB
│   │   └── socket.js        # Конфигурация Socket.io
│   ├── models/
│   │   ├── User.js          # Модель пользователя
│   │   └── Room.js          # Модель комнаты
│   ├── routes/
│   │   ├── authRoutes.js    # Маршруты аутентификации
│   │   └── roomRoutes.js    # Маршруты комнат
│   ├── controllers/
│   │   ├── authController.js
│   │   └── roomController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── services/
│   │   └── webrtcSignaling.js
│   └── server.js            # Главный файл сервера
├── package.json
└── .env
```

## Зависимости

- **express** - веб-фреймворк
- **socket.io** - real-time коммуникация
- **mongoose** - MongoDB ODM
- **bcrypt** - хеширование паролей
- **jsonwebtoken** - JWT аутентификация
- **cors** - CORS middleware
- **dotenv** - переменные окружения
- **uuid** - генерация уникальных ID
- **nodemon** - auto-reload при разработке

