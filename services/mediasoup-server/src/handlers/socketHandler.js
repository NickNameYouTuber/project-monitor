const RoomManager = require('../services/RoomManager');
const Peer = require('../services/PeerManager');

/**
 * Helper: Найти consumer ID по producer ID
 */
function findConsumerIdByProducerId(peer, producerId) {
  for (const [consumerId, consumer] of peer.consumers.entries()) {
    if (consumer.producerId === producerId) {
      return consumerId;
    }
  }
  return null;
}

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    let currentRoomId = null;
    let currentPeer = null;

    // Join room
    socket.on('mediasoup:join-room', async ({ roomId, rtpCapabilities }, callback) => {
      try {
        console.log(`👤 ${socket.id} присоединяется к комнате ${roomId}`);
        
        // Create or get room
        let room = RoomManager.getRoom(roomId);
        if (!room) {
          room = await RoomManager.createRoom(roomId);
        }

        // Create peer
        currentPeer = new Peer(socket.id, roomId, room.router);
        room.peers.set(socket.id, currentPeer);
        currentRoomId = roomId;

        // Join socket.io room for broadcasting
        socket.join(roomId);

        // Create transports
        const sendTransportParams = await currentPeer.createSendTransport();
        const recvTransportParams = await currentPeer.createRecvTransport();

        // Get existing producers in room
        const existingProducers = [];
        for (const [peerId, peer] of room.peers.entries()) {
          if (peerId !== socket.id) {
            for (const [kind, producer] of peer.producers.entries()) {
              existingProducers.push({
                peerId,
                producerId: producer.id,
                kind
              });
            }
          }
        }

        callback({
          success: true,
          routerRtpCapabilities: room.router.rtpCapabilities,
          sendTransportParams,
          recvTransportParams,
          existingProducers
        });

        // Notify others about new peer
        socket.to(roomId).emit('mediasoup:peer-joined', {
          peerId: socket.id
        });

        console.log(`✅ ${socket.id} присоединился к комнате ${roomId}`);
      } catch (error) {
        console.error('❌ Ошибка при присоединении к комнате:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Connect send transport
    socket.on('mediasoup:connect-send-transport', async ({ dtlsParameters }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        await currentPeer.connectSendTransport(dtlsParameters);
        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка подключения send transport:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Connect recv transport
    socket.on('mediasoup:connect-recv-transport', async ({ dtlsParameters }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        await currentPeer.connectRecvTransport(dtlsParameters);
        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка подключения recv transport:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Produce (start sending media)
    socket.on('mediasoup:produce', async ({ kind, rtpParameters }, callback) => {
      try {
        if (!currentPeer || !currentRoomId) {
          throw new Error('Peer or room not initialized');
        }

        const producerId = await currentPeer.produce(kind, rtpParameters);

        // Notify others about new producer
        socket.to(currentRoomId).emit('mediasoup:new-producer', {
          peerId: socket.id,
          producerId,
          kind
        });

        callback({ success: true, producerId });
      } catch (error) {
        console.error('❌ Ошибка создания producer:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Consume (start receiving media)
    socket.on('mediasoup:consume', async ({ producerId, rtpCapabilities }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        const consumerParams = await currentPeer.consume(producerId, rtpCapabilities);
        callback({ success: true, ...consumerParams });
      } catch (error) {
        console.error('❌ Ошибка создания consumer:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Resume consumer
    socket.on('mediasoup:resume-consumer', async ({ consumerId }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        await currentPeer.resumeConsumer(consumerId);
        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка resume consumer:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Pause consumer
    socket.on('mediasoup:pause-consumer', async ({ consumerId }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        await currentPeer.pauseConsumer(consumerId);
        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка pause consumer:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Set consumer preferred layers (for simulcast)
    socket.on('mediasoup:set-consumer-layers', async ({ consumerId, spatialLayer, temporalLayer }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        await currentPeer.setConsumerPreferredLayers(consumerId, spatialLayer, temporalLayer);
        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка set consumer layers:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Set consumer priority (for bandwidth management)
    socket.on('mediasoup:set-consumer-priority', async ({ consumerId, priority }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        await currentPeer.setConsumerPriority(consumerId, priority);
        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка set consumer priority:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Request key frame
    socket.on('mediasoup:request-keyframe', async ({ consumerId }, callback) => {
      try {
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        await currentPeer.requestConsumerKeyFrame(consumerId);
        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка request keyframe:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Close producer
    socket.on('mediasoup:close-producer', async ({ kind }, callback) => {
      try {
        if (!currentPeer || !currentRoomId) {
          throw new Error('Peer or room not initialized');
        }

        const producer = currentPeer.producers.get(kind);
        if (producer) {
          // Notify others
          socket.to(currentRoomId).emit('mediasoup:producer-closed', {
            peerId: socket.id,
            producerId: producer.id,
            kind
          });

          await currentPeer.closeProducer(kind);
        }

        callback({ success: true });
      } catch (error) {
        console.error('❌ Ошибка закрытия producer:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Get room stats
    socket.on('mediasoup:get-stats', (callback) => {
      try {
        const stats = RoomManager.getRoomStats();
        callback({ success: true, stats });
      } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Recreate transport (для агрессивного переподключения)
    socket.on('mediasoup:recreate-transport', async ({ type }, callback) => {
      try {
        console.log(`🔄 Recreating ${type} transport for ${socket.id}`);
        
        if (!currentPeer) {
          throw new Error('Peer not initialized');
        }

        let transportParams;
        if (type === 'send') {
          transportParams = await currentPeer.createSendTransport();
        } else {
          transportParams = await currentPeer.createRecvTransport();
        }

        callback({ success: true, transportParams });
        console.log(`✅ ${type} transport recreated for ${socket.id}`);
      } catch (error) {
        console.error(`❌ Ошибка пересоздания ${type} transport:`, error);
        callback({ success: false, error: error.message });
      }
    });

    // Consumer restart (для recovery мертвых треков)
    socket.on('request-consumer-restart', async ({ socketId: targetSocketId }) => {
      try {
        console.log(`🔄 Consumer restart request from ${socket.id} for ${targetSocketId}`);
        
        if (!currentRoomId) {
          throw new Error('Room not initialized');
        }

        const room = RoomManager.getRoom(currentRoomId);
        if (!room) {
          throw new Error('Room not found');
        }

        // Найти target peer
        const targetPeer = room.peers.get(targetSocketId);
        if (!targetPeer) {
          console.warn(`⚠️ Target peer ${targetSocketId} not found in room`);
          return;
        }

        // Пересоздать consumers для producers этого peer
        let recreatedCount = 0;
        targetPeer.producers.forEach(async (producer, kind) => {
          try {
            // Закрыть старый consumer если есть
            const oldConsumerId = findConsumerIdByProducerId(currentPeer, producer.id);
            if (oldConsumerId) {
              await currentPeer.closeConsumer(oldConsumerId);
            }

            // Создать новый consumer
            const { id, kind: consumerKind, rtpParameters } = await currentPeer.consume(
              producer.id,
              producer.rtpCapabilities
            );

            // Уведомить клиента о новом consumer
            socket.emit('mediasoup:new-consumer', {
              id,
              producerId: producer.id,
              kind: consumerKind,
              rtpParameters,
              socketId: targetSocketId
            });

            recreatedCount++;
            console.log(`✅ Consumer recreated: ${id} for producer ${producer.id}`);
          } catch (error) {
            console.error(`Failed to recreate consumer for producer ${producer.id}:`, error);
          }
        });

        console.log(`✅ Recreated ${recreatedCount} consumers for ${targetSocketId}`);
      } catch (error) {
        console.error('❌ Ошибка consumer restart:', error);
      }
    });

    // Leave room / disconnect
    const cleanup = () => {
      if (currentPeer && currentRoomId) {
        console.log(`👋 ${socket.id} покидает комнату ${currentRoomId}`);
        
        const room = RoomManager.getRoom(currentRoomId);
        if (room) {
          // Notify others
          socket.to(currentRoomId).emit('mediasoup:peer-left', {
            peerId: socket.id
          });

          // Remove peer from room
          room.peers.delete(socket.id);

          // Close peer resources
          currentPeer.close();

          // Close room if empty
          if (room.peers.size === 0) {
            setTimeout(() => {
              const stillEmpty = room.peers.size === 0;
              if (stillEmpty) {
                RoomManager.closeRoom(currentRoomId);
              }
            }, 5000); // Grace period
          }
        }

        currentPeer = null;
        currentRoomId = null;
      }
    };

    socket.on('mediasoup:leave-room', () => {
      cleanup();
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      cleanup();
    });
  });
}

module.exports = setupSocketHandlers;

