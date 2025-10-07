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
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.isGuest = false;
      next();
    } catch (error) {
      console.error('Ошибка аутентификации socket:', error);
      next(new Error('Неверный токен'));
    }
  });

  return io;
};

module.exports = initializeSocket;

