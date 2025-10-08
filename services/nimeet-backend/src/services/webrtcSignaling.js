const rooms = new Map();
const raisedHands = new Map(); // Map<roomId, Set<socketId>> - для хранения поднятых рук
const Room = require('../models/Room');
const UserRoom = require('../models/UserRoom');
const ActiveConnection = require('../models/ActiveConnection');
const ChatMessage = require('../models/ChatMessage');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

  const initializeWebRTCSignaling = (io) => {
  // Инициализация Redis адаптера для синхронизации между серверами
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  console.log('🔗 Подключаемся к Redis:', redisUrl.replace(/\/\/.*@/, '//***@')); // Скрываем пароль в логах
  
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Redis adapter инициализирован для Socket.IO');
    })
    .catch(err => {
      console.error('❌ Ошибка подключения к Redis:', err);
      console.log('⚠️  Продолжаем без Redis адаптера (только для одного сервера)');
    });

  // Периодическая очистка мертвых соединений каждые 30 секунд
  setInterval(async () => {
    try {
      const allConnections = await ActiveConnection.find({ isActive: true });
      const deadConnections = [];
      
      for (const conn of allConnections) {
        const socket = io.sockets.sockets.get(conn.socketId);
        if (!socket) {
          deadConnections.push(conn._id);
        }
      }
      
      if (deadConnections.length > 0) {
        await ActiveConnection.deleteMany({ _id: { $in: deadConnections } });
        console.log(`🧹 Автоочистка: удалено ${deadConnections.length} мертвых соединений`);
      }
    } catch (error) {
      console.error('Ошибка автоочистки мертвых соединений:', error);
    }
  }, 30000); // 30 секунд

  io.on('connection', (socket) => {
    console.log('🔌 Пользователь подключился:', socket.id);
    
    // Логируем все события от этого сокета для отладки
    const originalEmit = socket.emit;
    socket.emit = function(event, ...args) {
      console.log(`📤 Отправляем ${socket.id}: ${event}`, args.length > 0 ? args[0] : '');
      return originalEmit.apply(this, arguments);
    };
    
    const originalOn = socket.on;
    socket.on = function(event, handler) {
      console.log(`📥 Регистрируем обработчик для ${socket.id}: ${event}`);
      return originalOn.call(this, event, (...args) => {
        console.log(`📨 Получено от ${socket.id}: ${event}`, args.length > 0 ? args[0] : '');
        return handler.apply(this, args);
      });
    };

    // Таймаут для подключений, которые не присоединяются к комнате
    const joinTimeout = setTimeout(() => {
      console.log(`⏰ Таймаут: ${socket.id} не присоединился к комнате за 10 секунд`);
      socket.emit('join-timeout', { message: 'Не присоединились к комнате' });
    }, 10000);

    socket.on('join-room', async ({ roomId, userData }) => {
      clearTimeout(joinTimeout); // Отменяем таймаут
      console.log(`${userData.username} присоединяется к комнате ${roomId}`);

      try {
        // КРИТИЧНО: Сначала получаем список ТЕКУЩИХ участников комнаты
        // ПЕРЕД удалением старых соединений
        const currentConnections = await ActiveConnection.find({ 
          roomId: roomId 
        });
        
        console.log(`Текущие участники комнаты ${roomId}:`, 
          currentConnections.map(c => `${c.username} (${c.socketId})`));

        // Удаляем старые соединения этого пользователя (по userId)
        const oldConnections = await ActiveConnection.find({ 
          userId: userData.userId,
          roomId: roomId 
        });
        
        // Отправляем user-left для каждого старого соединения
        for (const oldConn of oldConnections) {
          if (oldConn.socketId !== socket.id) {
            console.log(`📤 Отправляю user-left для старого соединения: ${oldConn.socketId} (${oldConn.username})`);
            io.to(roomId).emit('user-left', { 
              socketId: oldConn.socketId,
              userId: oldConn.userId,
              username: oldConn.username
            });
            
            // Удаляем из in-memory карты
            const roomParticipants = rooms.get(roomId);
            if (roomParticipants) {
              roomParticipants.delete(oldConn.socketId);
            }
          }
        }
        
        const deletedConnections = await ActiveConnection.deleteMany({ 
          userId: userData.userId,
          roomId: roomId 
        });
        
        if (deletedConnections.deletedCount > 0) {
          console.log(`Удалено ${deletedConnections.deletedCount} старых соединений для ${userData.username}`);
        }
        
        // Также удаляем мертвые соединения с этим socketId (на случай если что-то пошло не так)
        const deletedSocketConnections = await ActiveConnection.deleteMany({ 
          socketId: socket.id
        });
        
        if (deletedSocketConnections.deletedCount > 0) {
          console.log(`Удалено ${deletedSocketConnections.deletedCount} мертвых соединений для socket ${socket.id}`);
        }
        
        // Проверяем, не существует ли уже соединение с этим socketId
        const existingConnection = await ActiveConnection.findOne({ 
          socketId: socket.id,
          roomId: roomId 
        });
        
        let connection;
        if (existingConnection) {
          console.log(`🔄 Соединение уже существует, обновляем: ${userData.username} (${socket.id}) в комнате ${roomId}`);
          connection = await ActiveConnection.findOneAndUpdate(
            { socketId: socket.id, roomId: roomId },
            { 
              userId: userData.userId,
              username: userData.username,
              mediaState: {
                camera: true,
                microphone: true,
                screen: false
              },
              lastSeen: new Date(),
              isActive: true
            },
            { new: true }
          );
        } else {
          // Создаем новое активное соединение
          connection = await ActiveConnection.create({
            socketId: socket.id,
            roomId: roomId,
            userId: userData.userId,
            username: userData.username,
            mediaState: {
              camera: true,
              microphone: true,
              screen: false
            },
            lastSeen: new Date(),
            isActive: true
          });
          console.log(`✅ Создано новое соединение в БД: ${userData.username} (${socket.id}) в комнате ${roomId}`);
        }

        // Находим или создаем комнату в БД
        let room = await Room.findOne({ roomId });
        let isNewRoom = false;
        
        if (!room) {
          console.log(`Комната ${roomId} не найдена в БД, создаем автоматически`);
          // Для гостей используем null вместо невалидного ObjectId
          const ownerIdValue = userData.userId === 'guest' || userData.userId.startsWith('guest-') 
            ? null 
            : userData.userId;
          
          room = await Room.create({
            roomId,
            name: `Комната ${roomId}`,
            ownerId: ownerIdValue,
            isStatic: true,
            customId: roomId
          });
          isNewRoom = true;
        }

        // Проверяем есть ли у пользователя связь с этой комнатой
        // Пропускаем для гостей, так как у них нет валидного ObjectId
        if (userData.userId !== 'guest' && !userData.userId.startsWith('guest-')) {
          let userRoom = await UserRoom.findOne({ userId: userData.userId, roomId });
          
          if (!userRoom) {
            // Определяем роль: owner если комната новая, member если существующая
            const role = isNewRoom ? 'owner' : 'member';
            
            userRoom = await UserRoom.create({
              userId: userData.userId,
              roomId,
              role,
              customName: room.name,
            });
            console.log(`✅ Создана связь UserRoom: ${userData.username} → ${roomId} (${role})`);
          } else {
            // Обновляем lastAccessed
            userRoom.lastAccessed = new Date();
            await userRoom.save();
          }
        } else {
          console.log(`⚠️ Пропускаем создание UserRoom для гостя: ${userData.username}`);
        }

        // ВАЖНО: Присоединяемся к Socket.IO комнате
        socket.join(roomId);

        // Синхронизируем in-memory комнату
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Map());
        }
        
        const roomParticipants = rooms.get(roomId);
        
        // Очищаем in-memory от старых записей этого пользователя
        for (const [sid, participant] of roomParticipants.entries()) {
          if (participant.userId === userData.userId && sid !== socket.id) {
            roomParticipants.delete(sid);
            console.log(`Удалена старая in-memory запись ${sid} для ${userData.userId}`);
          }
        }
        
        // Добавляем текущего пользователя
        roomParticipants.set(socket.id, {
          socketId: socket.id,
          userId: userData.userId,
          username: userData.username,
          mediaState: connection.mediaState
        });

        // КРИТИЧНО: Получаем существующих участников из БД
        // Но сначала проверяем, какие сокеты реально подключены
        const existingConnections = await ActiveConnection.find({ 
          roomId: roomId,
          socketId: { $ne: socket.id }, // Исключаем текущего пользователя
          isActive: true // Только активные соединения
        });
        
        // Проверяем, какие сокеты реально подключены
        const activeParticipants = [];
        const deadConnections = [];
        
        for (const conn of existingConnections) {
          const targetSocket = io.sockets.sockets.get(conn.socketId);
          if (targetSocket) {
            // Сокет активен
            activeParticipants.push({
              socketId: conn.socketId,
              userId: conn.userId,
              username: conn.username,
              mediaState: conn.mediaState
            });
          } else {
            // Сокет мертв, помечаем для удаления
            deadConnections.push(conn._id);
          }
        }
        
        // Удаляем мертвые соединения из БД
        if (deadConnections.length > 0) {
          await ActiveConnection.deleteMany({ _id: { $in: deadConnections } });
          console.log(`🧹 Удалено ${deadConnections.length} мертвых соединений из БД`);
        }
        
        console.log(`Найдено ${activeParticipants.length} активных участников в комнате ${roomId}`);
        activeParticipants.forEach(p => {
          console.log(`  - ${p.username} (${p.socketId})`);
        });

        console.log(`Отправляем ${userData.username} список из ${activeParticipants.length} существующих участников`);

        // Получаем список поднятых рук для комнаты
        const roomHands = raisedHands.get(roomId) || new Set();
        const raisedHandsArray = Array.from(roomHands);

        // Отправляем список существующих участников новому пользователю
        if (activeParticipants.length > 0) {
          socket.emit('existing-participants', {
            participants: activeParticipants,
            raisedHands: raisedHandsArray, // Добавляем список socketId с поднятыми руками
          });
        }

        // Отправляем историю чата новому пользователю (последние 100 сообщений)
        try {
          const chatHistory = await ChatMessage.find({ roomId })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();
          
          if (chatHistory.length > 0) {
            // Отправляем в обратном порядке (старые сначала)
            socket.emit('chat-history', {
              messages: chatHistory.reverse().map(msg => ({
                id: msg._id.toString(),
                senderId: msg.senderId,
                senderName: msg.senderName,
                message: msg.message,
                timestamp: msg.timestamp.getTime(),
                fileUrl: msg.fileUrl,
                fileName: msg.fileName,
                fileType: msg.fileType,
              })),
            });
            console.log(`📜 Отправлена история чата: ${chatHistory.length} сообщений`);
          }
        } catch (error) {
          console.error('Ошибка загрузки истории чата:', error);
        }

        // Уведомляем ДРУГИХ участников о новом пользователе
        socket.to(roomId).emit('user-joined', {
          participant: {
            socketId: socket.id,
            userId: userData.userId,
            username: userData.username,
            mediaState: connection.mediaState
          },
        });

        console.log(`✓ ${userData.username} (${socket.id}) присоединился к комнате ${roomId}`);
        console.log(`  Всего участников в комнате сейчас: ${activeParticipants.length + 1}`);
        
        // Проверяем, что соединение действительно сохранилось в БД
        const savedConnection = await ActiveConnection.findOne({ socketId: socket.id });
        if (savedConnection) {
          console.log(`✅ Подтверждено: соединение ${socket.id} сохранено в БД`);
        } else {
          console.error(`❌ ОШИБКА: соединение ${socket.id} НЕ сохранено в БД!`);
        }

      } catch (error) {
        console.error('Ошибка присоединения к комнате:', error);
        
        // Если это ошибка дублирования ключа, не отправляем ошибку клиенту
        if (error.code === 11000) {
          console.log(`⚠️ Дублирование соединения ${socket.id} - игнорируем`);
          return;
        }
        
        socket.emit('room-error', { message: 'Ошибка присоединения к комнате' });
      }
    });

    socket.on('offer', ({ targetSocketId, offer, connectionType }) => {
      console.log(`Отправка offer (${connectionType}) от ${socket.id} к ${targetSocketId}`);
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        console.log(`✓ Цель ${targetSocketId} найдена, отправляем offer (${connectionType})`);
        targetSocket.emit('receive-offer', {
          from: socket.id,
          offer,
          connectionType,
        });
      } else {
        console.log(`✗ Цель ${targetSocketId} НЕ найдена (возможно отключился)`);
        socket.emit('peer-unavailable', { targetSocketId });
      }
    });

    socket.on('answer', ({ targetSocketId, answer, connectionType }) => {
      console.log(`Отправка answer (${connectionType}) от ${socket.id} к ${targetSocketId}`);
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        console.log(`✓ Цель ${targetSocketId} найдена, отправляем answer (${connectionType})`);
        targetSocket.emit('receive-answer', {
          from: socket.id,
          answer,
          connectionType,
        });
      } else {
        console.log(`✗ Цель ${targetSocketId} НЕ найдена`);
        socket.emit('peer-unavailable', { targetSocketId });
      }
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate, connectionType }) => {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('receive-ice-candidate', {
          from: socket.id,
          candidate,
          connectionType,
        });
      }
    });

    socket.on('toggle-media', async ({ roomId, mediaType, enabled }) => {
      try {
        // Обновляем в БД
        await ActiveConnection.updateOne(
          { socketId: socket.id },
          { 
            [`mediaState.${mediaType}`]: enabled,
            lastSeen: new Date()
          }
        );

        // Обновляем in-memory
        const roomParticipants = rooms.get(roomId);
        if (roomParticipants && roomParticipants.has(socket.id)) {
          const participant = roomParticipants.get(socket.id);
          participant.mediaState[mediaType] = enabled;
        }
        
        // Уведомляем других участников
        socket.to(roomId).emit('media-toggled', {
          socketId: socket.id,
          mediaType,
          enabled,
        });

        console.log(`${socket.id} переключил ${mediaType}: ${enabled}`);
      } catch (error) {
        console.error('Ошибка toggle-media:', error);
      }
    });

    socket.on('screen-share-started', ({ roomId, screenStreamId }) => {
      console.log(`Screen share STARTED от ${socket.id}, streamId: ${screenStreamId}`);
      
      const roomParticipants = rooms.get(roomId);
      if (roomParticipants && roomParticipants.has(socket.id)) {
        const participant = roomParticipants.get(socket.id);
        participant.screenStreamId = screenStreamId;
      }
      
      socket.to(roomId).emit('screen-share-started', {
        socketId: socket.id,
        screenStreamId,
      });
    });

    socket.on('screen-share-stopped', ({ roomId }) => {
      console.log(`Screen share STOPPED от ${socket.id}`);
      
      const roomParticipants = rooms.get(roomId);
      if (roomParticipants && roomParticipants.has(socket.id)) {
        const participant = roomParticipants.get(socket.id);
        delete participant.screenStreamId;
      }
      
      socket.to(roomId).emit('screen-share-stopped', {
        socketId: socket.id,
      });
    });

    // Новое событие: запрос списка участников комнаты
    socket.on('request-room-participants', async ({ roomId }) => {
      try {
        // Получаем участников из БД, но проверяем активность
        const existingConnections = await ActiveConnection.find({ 
          roomId: roomId,
          socketId: { $ne: socket.id }, // Исключаем текущего пользователя
          isActive: true // Только активные соединения
        });
        
        // Фильтруем только активные сокеты
        const activeParticipants = [];
        for (const conn of existingConnections) {
          const targetSocket = io.sockets.sockets.get(conn.socketId);
          if (targetSocket) {
            activeParticipants.push({
              socketId: conn.socketId,
              userId: conn.userId,
              username: conn.username,
              mediaState: conn.mediaState
            });
          }
        }
        
        socket.emit('room-participants-list', { participants: activeParticipants });
        console.log(`Отправлен список активных участников для ${socket.id}: ${activeParticipants.length}`);
      } catch (error) {
        console.error('Ошибка получения списка участников:', error);
      }
    });

    socket.on('leave-room', async ({ roomId }) => {
      await handleUserDisconnect(socket, roomId);
    });

    // Чат сообщения
    socket.on('chat-message', async ({ roomId, message, timestamp, file }) => {
      try {
        console.log(`💬 Сообщение в чате от ${socket.id} в комнате ${roomId}:`, message, file ? `с файлом ${file.name}` : '');
        
        // Получаем информацию об отправителе
        const connection = await ActiveConnection.findOne({ socketId: socket.id, roomId });
        
        if (!connection) {
          console.error('Соединение не найдено для отправителя сообщения');
          return;
        }

        let fileUrl = null;
        let fileName = null;
        let fileType = null;

        // Обрабатываем файл если он есть
        if (file && file.data) {
          try {
            // Конвертируем base64 обратно в data URL для передачи клиентам
            fileUrl = `data:${file.type};base64,${file.data}`;
            fileName = file.name;
            fileType = file.type;
            console.log(`📎 Файл обработан: ${fileName} (${fileType})`);
          } catch (error) {
            console.error('Ошибка обработки файла:', error);
          }
        }

        // Сохраняем сообщение в БД
        const savedMessage = await ChatMessage.create({
          roomId,
          senderId: socket.id,
          senderName: connection.username,
          message: message || '',
          fileUrl,
          fileName,
          fileType,
          timestamp: new Date(timestamp),
        });
        
        console.log(`💾 Сообщение сохранено в БД: ${savedMessage._id}`);

        // Отправляем сообщение всем в комнате (включая отправителя для подтверждения)
        io.to(roomId).emit('chat-message', {
          id: savedMessage._id.toString(),
          senderId: socket.id,
          senderName: connection.username,
          message: message || '',
          timestamp,
          fileUrl,
          fileName,
          fileType,
        });
      } catch (error) {
        console.error('Ошибка отправки сообщения чата:', error);
      }
    });

    // Поднятие руки
    socket.on('raise-hand', ({ roomId, isRaised }) => {
      // Обновляем состояние поднятых рук
      if (!raisedHands.has(roomId)) {
        raisedHands.set(roomId, new Set());
      }
      const roomHands = raisedHands.get(roomId);
      
      if (isRaised) {
        roomHands.add(socket.id);
      } else {
        roomHands.delete(socket.id);
      }
      
      // Транслируем состояние поднятой руки другим участникам комнаты
      socket.to(roomId).emit('hand-raised', {
        socketId: socket.id,
        isRaised,
      });
      console.log(`✋ Пользователь ${socket.id} ${isRaised ? 'поднял' : 'опустил'} руку в комнате ${roomId}`);
    });

    // Состояние говорения
    socket.on('speaking-state', ({ roomId, isSpeaking }) => {
      // Транслируем состояние говорения другим участникам комнаты
      socket.to(roomId).emit('speaking-state-update', {
        socketId: socket.id,
        isSpeaking,
      });
    });

    socket.on('disconnect', async (reason) => {
      clearTimeout(joinTimeout); // Очищаем таймаут при отключении
      console.log('🔌 Пользователь отключился:', socket.id, 'Причина:', reason);
      console.log('   Transport:', socket.conn?.transport?.name || 'unknown');

      // Находим все комнаты, где был этот socket
      const userConnections = await ActiveConnection.find({ socketId: socket.id });
      
      for (const conn of userConnections) {
        await handleUserDisconnect(socket, conn.roomId);
      }

      // Также проверяем in-memory комнаты
      for (const [roomId, participants] of rooms.entries()) {
        if (participants.has(socket.id)) {
          await handleUserDisconnect(socket, roomId);
        }
      }
    });
  });

  const handleUserDisconnect = async (socket, roomId) => {
    try {
      console.log(`🔌 Обрабатываем отключение: ${socket.id} из комнаты ${roomId}`);
      
      // НЕ удаляем сразу из БД - даем время на переподключение
      // Помечаем соединение как неактивное, но оставляем в БД на 30 секунд
      const updatedConn = await ActiveConnection.findOneAndUpdate(
        { socketId: socket.id, roomId: roomId },
        { 
          lastSeen: new Date(),
          isActive: false // Добавляем флаг неактивности
        },
        { new: true }
      );
      
      if (updatedConn) {
        console.log(`⏸️ Соединение ${socket.id} (${updatedConn.username}) помечено как неактивное в комнате ${roomId}`);
        
        // Удаляем через 30 секунд, если не переподключится
        setTimeout(async () => {
          const stillInactive = await ActiveConnection.findOne({ 
            socketId: socket.id, 
            roomId: roomId,
            isActive: false 
          });
          
          if (stillInactive) {
            await ActiveConnection.findOneAndDelete({ 
              socketId: socket.id,
              roomId: roomId 
            });
            console.log(`🗑️ Соединение ${socket.id} (${updatedConn.username}) окончательно удалено из комнаты ${roomId}`);
          } else {
            console.log(`🔄 Соединение ${socket.id} переподключилось, не удаляем`);
          }
        }, 30000); // 30 секунд
        
      } else {
        console.log(`⚠️ Соединение ${socket.id} не найдено в БД для комнаты ${roomId}`);
      }

      // Удаляем из поднятых рук
      const roomHands = raisedHands.get(roomId);
      if (roomHands) {
        roomHands.delete(socket.id);
        if (roomHands.size === 0) {
          raisedHands.delete(roomId);
        }
      }

      // Удаляем из in-memory
      const roomParticipants = rooms.get(roomId);
      if (roomParticipants) {
        roomParticipants.delete(socket.id);
        
        // Если комната пуста, удаляем её из памяти
        if (roomParticipants.size === 0) {
          rooms.delete(roomId);
          console.log(`Комната ${roomId} пуста, удалена из памяти`);
        }
      }
      
      // Уведомляем других участников
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
      });

      socket.leave(roomId);

      // Подсчитываем оставшихся участников
      const remainingCount = await ActiveConnection.countDocuments({ roomId });
      console.log(`Участник ${socket.id} покинул комнату ${roomId}. Осталось: ${remainingCount}`);
      
    } catch (error) {
      console.error('Ошибка при отключении пользователя:', error);
    }
  };
};

module.exports = initializeWebRTCSignaling;