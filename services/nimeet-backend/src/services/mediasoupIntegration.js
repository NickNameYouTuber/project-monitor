/**
 * MediaSoup Integration Service
 * Проксирует события между клиентами и MediaSoup сервером
 */

const { io: socketIOClient } = require('socket.io-client');

class MediaSoupIntegration {
  constructor() {
    this.enabled = process.env.USE_MEDIASOUP === 'true';
    this.serverUrl = process.env.MEDIASOUP_SERVER_URL || 'http://mediasoup-server:4001';
    this.clientConnections = new Map(); // socketId -> mediaSoupClient
    
    if (this.enabled) {
      console.log('✅ MediaSoup integration enabled, server:', this.serverUrl);
    } else {
      console.log('⚠️  MediaSoup integration disabled, using mesh P2P');
    }
  }

  /**
   * Создает подключение к MediaSoup серверу для клиента
   */
  createClientConnection(socketId) {
    if (!this.enabled) return null;

    if (this.clientConnections.has(socketId)) {
      return this.clientConnections.get(socketId);
    }

    const client = socketIOClient(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    client.on('connect', () => {
      console.log(`🔗 MediaSoup client connected for ${socketId}`);
    });

    client.on('disconnect', () => {
      console.log(`🔌 MediaSoup client disconnected for ${socketId}`);
    });

    client.on('connect_error', (error) => {
      console.error(`❌ MediaSoup connection error for ${socketId}:`, error.message);
    });

    this.clientConnections.set(socketId, client);
    return client;
  }

  /**
   * Удаляет подключение к MediaSoup серверу
   */
  removeClientConnection(socketId) {
    const client = this.clientConnections.get(socketId);
    if (client) {
      client.disconnect();
      this.clientConnections.delete(socketId);
      console.log(`🗑️  MediaSoup client connection removed for ${socketId}`);
    }
  }

  /**
   * Проксирует событие от клиента к MediaSoup серверу
   */
  proxyToMediaSoup(socket, event, data, callback) {
    if (!this.enabled) {
      if (callback) callback({ success: false, error: 'MediaSoup not enabled' });
      return;
    }

    const client = this.createClientConnection(socket.id);
    if (!client) {
      if (callback) callback({ success: false, error: 'Failed to create client connection' });
      return;
    }

    // Proxy event to MediaSoup server
    client.emit(event, data, (response) => {
      if (callback) callback(response);
    });
  }

  /**
   * Устанавливает обработчики MediaSoup событий для Socket.IO сервера
   */
  setupSocketHandlers(io) {
    if (!this.enabled) return;

    io.on('connection', (socket) => {
      // Join room через MediaSoup
      socket.on('mediasoup:join-room', (data, callback) => {
        console.log(`📥 mediasoup:join-room from ${socket.id}:`, data.roomId);
        this.proxyToMediaSoup(socket, 'mediasoup:join-room', data, callback);
      });

      // Connect transports
      socket.on('mediasoup:connect-send-transport', (data, callback) => {
        this.proxyToMediaSoup(socket, 'mediasoup:connect-send-transport', data, callback);
      });

      socket.on('mediasoup:connect-recv-transport', (data, callback) => {
        this.proxyToMediaSoup(socket, 'mediasoup:connect-recv-transport', data, callback);
      });

      // Produce
      socket.on('mediasoup:produce', (data, callback) => {
        console.log(`🎬 mediasoup:produce from ${socket.id}:`, data.kind);
        this.proxyToMediaSoup(socket, 'mediasoup:produce', data, callback);
      });

      // Consume
      socket.on('mediasoup:consume', (data, callback) => {
        this.proxyToMediaSoup(socket, 'mediasoup:consume', data, callback);
      });

      socket.on('mediasoup:resume-consumer', (data, callback) => {
        this.proxyToMediaSoup(socket, 'mediasoup:resume-consumer', data, callback);
      });

      socket.on('mediasoup:pause-consumer', (data, callback) => {
        this.proxyToMediaSoup(socket, 'mediasoup:pause-consumer', data, callback);
      });

      // Close producer
      socket.on('mediasoup:close-producer', (data, callback) => {
        this.proxyToMediaSoup(socket, 'mediasoup:close-producer', data, callback);
      });

      // Leave room
      socket.on('mediasoup:leave-room', () => {
        this.removeClientConnection(socket.id);
      });

      // Forward MediaSoup server events to client
      const client = this.clientConnections.get(socket.id);
      if (client) {
        // New producer from another peer
        client.on('mediasoup:new-producer', (data) => {
          socket.emit('mediasoup:new-producer', data);
        });

        // Peer joined
        client.on('mediasoup:peer-joined', (data) => {
          socket.emit('mediasoup:peer-joined', data);
        });

        // Peer left
        client.on('mediasoup:peer-left', (data) => {
          socket.emit('mediasoup:peer-left', data);
        });

        // Producer closed
        client.on('mediasoup:producer-closed', (data) => {
          socket.emit('mediasoup:producer-closed', data);
        });
      }

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        this.removeClientConnection(socket.id);
      });
    });

    console.log('✅ MediaSoup socket handlers установлены');
  }

  /**
   * Получает статистику MediaSoup сервера
   */
  async getStats() {
    if (!this.enabled) {
      return { enabled: false };
    }

    try {
      const client = socketIOClient(this.serverUrl, {
        transports: ['websocket']
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.disconnect();
          reject(new Error('Timeout'));
        }, 5000);

        client.on('connect', () => {
          client.emit('mediasoup:get-stats', (response) => {
            clearTimeout(timeout);
            client.disconnect();
            resolve(response);
          });
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          client.disconnect();
          reject(error);
        });
      });
    } catch (error) {
      return { enabled: true, error: error.message };
    }
  }
}

module.exports = new MediaSoupIntegration();

