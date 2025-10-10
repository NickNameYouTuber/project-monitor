require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const RoomManager = require('./services/RoomManager');
const setupSocketHandlers = require('./handlers/socketHandler');
const metricsCollector = require('./services/MetricsCollector');

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    rooms: RoomManager.getRoomStats()
  });
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(metricsCollector.exportPrometheusMetrics());
});

// JSON metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json(metricsCollector.exportJsonMetrics());
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Setup Redis adapter for horizontal scaling
async function setupRedisAdapter() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('⚠️  Redis URL not configured, running in single-server mode');
    return;
  }

  try {
    console.log('🔗 Подключение к Redis...');
    
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis adapter инициализирован');
  } catch (error) {
    console.error('❌ Ошибка подключения к Redis:', error);
    console.log('⚠️  Продолжаем без Redis adapter');
  }
}

// Start server
async function start() {
  try {
    // Initialize MediaSoup workers
    await RoomManager.initialize();
    
    // Start cleanup timer
    RoomManager.startCleanupTimer();
    
    // Setup Redis
    await setupRedisAdapter();
    
    // Setup Socket.IO handlers
    setupSocketHandlers(io);
    
    const PORT = process.env.PORT || 4001;
    server.listen(PORT, () => {
      console.log(`🚀 MediaSoup server запущен на порту ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Получен SIGINT, завершаем работу...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Получен SIGTERM, завершаем работу...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

start();

