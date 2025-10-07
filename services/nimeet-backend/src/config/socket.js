const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const initializeSocket = (httpServer) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:7670',
    'http://localhost:7677',
    'https://meet.nicorp.tech',
    'http://meet.nicorp.tech',
    'https://nit.nicorp.tech',
    'http://nit.nicorp.tech'
  ];

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Увеличиваем таймауты для стабильности
    pingTimeout: 60000, // 60 секунд (по умолчанию 20000)
    pingInterval: 25000, // 25 секунд (по умолчанию 25000)
    upgradeTimeout: 30000, // 30 секунд для апгрейда
    // Приоритет WebSocket над polling
    transports: ['websocket', 'polling'],
    // Разрешаем HTTP long-polling как fallback
    allowEIO3: true,
    // Максимальный размер буфера
    maxHttpBufferSize: 1e8, // 100 MB
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        console.log('Гостевое подключение Socket.IO');
        socket.isGuest = true;
        socket.userId = null;
        socket.username = 'Guest';
        return next();
      }

      // Декодируем JWT токен из Project Monitor
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Извлекаем данные пользователя из токена PM
      // Токен PM содержит: { sub: userId, username: "...", ... }
      socket.userId = decoded.sub || decoded.userId || decoded.id;
      socket.username = decoded.username || decoded.login || 'User';
      socket.isGuest = false;
      
      console.log(`✅ Авторизован пользователь PM: ${socket.username} (ID: ${socket.userId})`);
      next();
    } catch (error) {
      console.error('Ошибка аутентификации socket:', error.message);
      // Разрешаем подключение как гость при ошибке токена
      console.log('⚠️ Невалидный токен, подключаем как гостя');
      socket.isGuest = true;
      socket.userId = null;
      socket.username = 'Guest';
      next();
    }
  });

  return io;
};

module.exports = initializeSocket;

