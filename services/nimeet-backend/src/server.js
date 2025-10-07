require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDatabase = require('./config/database');
const initializeSocket = require('./config/socket');
const initializeWebRTCSignaling = require('./services/webrtcSignaling');
const initializeSimpleMeetService = require('./services/simpleMeetService');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');

const app = express();
const server = http.createServer(app);

// Настройка CORS для поддержки нескольких origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:7677',
  'http://localhost:7676',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://meet.nicorp.tech',
  'http://meet.nicorp.tech',
  'tauri://localhost',
  'http://tauri.localhost'
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 CORS запрос от origin:', origin);
    
    // Разрешаем запросы без origin (например, Postman, мобильные приложения)
    if (!origin) {
      console.log('✅ CORS разрешен (нет origin)');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS разрешен для origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS заблокирован для origin:', origin);
      console.log('📋 Разрешенные origins:', allowedOrigins);
      callback(new Error('Не разрешено CORS политикой'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Range']
}));

app.use(express.json());

// Middleware для логирования всех запросов
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} от ${req.get('Origin') || 'неизвестно'}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'NIMeet API работает' });
});

connectDatabase();

const io = initializeSocket(server);
initializeWebRTCSignaling(io);

// Инициализация простого сервиса встреч
const simpleMeetService = initializeSimpleMeetService(io);

// API эндпоинт для простых встреч
app.get('/api/simple-meet/rooms', (req, res) => {
  const rooms = simpleMeetService.getRooms();
  res.json({ rooms });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Окружение: ${process.env.NODE_ENV || 'development'}`);
});

