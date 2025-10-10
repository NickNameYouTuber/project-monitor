const mediasoup = require('mediasoup');
const config = require('../config/mediasoup');
const metricsCollector = require('./MetricsCollector');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> { router, peers: Map<socketId, Peer> }
    this.workers = [];
    this.nextWorkerIdx = 0;
  }

  async initialize() {
    console.log('🚀 Инициализация MediaSoup workers...');
    
    const numWorkers = config.worker.numWorkers;
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.worker.logLevel,
        logTags: config.worker.logTags,
        rtcMinPort: config.worker.rtcMinPort,
        rtcMaxPort: config.worker.rtcMaxPort
      });

      worker.on('died', () => {
        console.error('❌ MediaSoup worker died, exiting in 2 seconds...');
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      console.log(`✅ Worker ${i + 1}/${numWorkers} создан (PID: ${worker.pid})`);
    }

    metricsCollector.setWorkersCount(numWorkers);
    console.log('✅ Все MediaSoup workers инициализированы');
  }

  getNextWorker() {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  async createRoom(roomId) {
    if (this.rooms.has(roomId)) {
      console.log(`⚠️  Комната ${roomId} уже существует`);
      return this.rooms.get(roomId);
    }

    console.log(`🏠 Создание комнаты ${roomId}...`);
    
    const worker = this.getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: config.router.mediaCodecs
    });

    const room = {
      id: roomId,
      router,
      peers: new Map(),
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    metricsCollector.incrementRoomsCreated();
    console.log(`✅ Комната ${roomId} создана на worker PID ${worker.pid}`);
    
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  async closeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    console.log(`🗑️  Закрытие комнаты ${roomId}...`);
    
    // Close all peer transports
    for (const peer of room.peers.values()) {
      peer.close();
    }

    // Close router
    room.router.close();
    
    this.rooms.delete(roomId);
    metricsCollector.incrementRoomsClosed();
    console.log(`✅ Комната ${roomId} закрыта`);
  }

  getRoomStats() {
    const stats = [];
    
    for (const [roomId, room] of this.rooms.entries()) {
      stats.push({
        roomId,
        peerCount: room.peers.size,
        uptime: Date.now() - room.createdAt
      });
    }
    
    return stats;
  }

  // Cleanup empty rooms periodically
  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      const emptyRooms = [];

      for (const [roomId, room] of this.rooms.entries()) {
        if (room.peers.size === 0 && (now - room.createdAt) > 300000) { // 5 minutes
          emptyRooms.push(roomId);
        }
      }

      for (const roomId of emptyRooms) {
        this.closeRoom(roomId);
      }
    }, 60000); // Check every minute
  }
}

module.exports = new RoomManager();

