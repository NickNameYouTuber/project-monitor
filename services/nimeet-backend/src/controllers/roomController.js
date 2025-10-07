const Room = require('../models/Room');
const UserRoom = require('../models/UserRoom');
const { v4: uuidv4 } = require('uuid');

exports.createRoom = async (req, res) => {
  try {
    const { isStatic = false, customId = null, name = '' } = req.body;
    let roomId;

    if (isStatic && customId) {
      // Проверяем существует ли уже комната с таким customId
      const existingRoom = await Room.findOne({ customId });
      if (existingRoom) {
        // Комната существует, проверяем добавил ли её уже этот пользователь
        const userRoom = await UserRoom.findOne({ 
          userId: req.user._id, 
          roomId: existingRoom.roomId 
        });
        
        if (userRoom) {
          return res.status(400).json({ message: 'Вы уже добавили эту комнату' });
        }
        
        // Добавляем существующую комнату пользователю с ролью member
        const newUserRoom = await UserRoom.create({
          userId: req.user._id,
          roomId: existingRoom.roomId,
          role: 'member',
          customName: name || existingRoom.name,
        });

        return res.status(201).json({
          room: {
            id: existingRoom._id,
            roomId: existingRoom.roomId,
            name: existingRoom.name,
            ownerId: existingRoom.ownerId,
            isStatic: existingRoom.isStatic,
            customId: existingRoom.customId,
            createdAt: existingRoom.createdAt,
            role: newUserRoom.role,
          },
          roomId: existingRoom.roomId,
        });
      }
      roomId = customId;
    } else {
      roomId = uuidv4();
    }

    // Создаем новую комнату (первый раз)
    const room = await Room.create({
      roomId,
      name,
      ownerId: req.user._id,
      isStatic,
      customId: isStatic && customId ? customId : undefined,
    });

    // Добавляем создателя с ролью owner
    const userRoom = await UserRoom.create({
      userId: req.user._id,
      roomId: room.roomId,
      role: 'owner',
      customName: name,
    });

    res.status(201).json({
      room: {
        id: room._id,
        roomId: room.roomId,
        name: room.name,
        ownerId: room.ownerId,
        isStatic: room.isStatic,
        customId: room.customId,
        createdAt: room.createdAt,
        role: userRoom.role,
      },
      roomId: room.roomId,
    });
  } catch (error) {
    console.error('Ошибка создания комнаты:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании комнаты' });
  }
};

exports.getRoomInfo = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    res.json({
      id: room._id,
      roomId: room.roomId,
      name: room.name,
      ownerId: room.ownerId,
      isStatic: room.isStatic,
      customId: room.customId,
      createdAt: room.createdAt,
      participants: room.participants,
    });
  } catch (error) {
    console.error('Ошибка получения информации о комнате:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.getUserRooms = async (req, res) => {
  try {
    // Находим все связи пользователя с комнатами
    const userRooms = await UserRoom.find({ userId: req.user._id }).sort({ lastAccessed: -1 });

    // Получаем информацию о комнатах
    const roomIds = userRooms.map(ur => ur.roomId);
    const rooms = await Room.find({ roomId: { $in: roomIds } });

    // Создаем словарь комнат для быстрого доступа
    const roomsMap = new Map(rooms.map(room => [room.roomId, room]));

    // Объединяем данные
    const result = userRooms.map(userRoom => {
      const room = roomsMap.get(userRoom.roomId);
      if (!room) return null;

      return {
        id: room._id,
        roomId: room.roomId,
        name: userRoom.customName || room.name,
        ownerId: room.ownerId,
        isStatic: room.isStatic,
        customId: room.customId,
        createdAt: room.createdAt,
        role: userRoom.role,
        addedAt: userRoom.addedAt,
        lastAccessed: userRoom.lastAccessed,
      };
    }).filter(Boolean); // Убираем null значения

    res.json({ rooms: result });
  } catch (error) {
    console.error('Ошибка получения комнат пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Проверяем связь пользователя с комнатой
    const userRoom = await UserRoom.findOne({ userId: req.user._id, roomId });

    if (!userRoom) {
      return res.status(404).json({ message: 'Комната не найдена в вашем списке' });
    }

    // Если пользователь владелец - удаляем всю комнату и все связи
    if (userRoom.role === 'owner') {
      const room = await Room.findOne({ roomId });
      
      if (room) {
        // Удаляем комнату
        await Room.deleteOne({ roomId });
        
        // Удаляем все связи пользователей с этой комнатой
        await UserRoom.deleteMany({ roomId });
        
        return res.json({ message: 'Комната удалена полностью' });
      }
    }

    // Если обычный участник - удаляем только его связь
    await UserRoom.deleteOne({ userId: req.user._id, roomId });

    res.json({ message: 'Комната удалена из вашего списка' });
  } catch (error) {
    console.error('Ошибка удаления комнаты:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name } = req.body;

    // Проверяем связь пользователя с комнатой
    const userRoom = await UserRoom.findOne({ userId: req.user._id, roomId });

    if (!userRoom) {
      return res.status(404).json({ message: 'Комната не найдена в вашем списке' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    // Если владелец - обновляем глобальное имя комнаты
    if (userRoom.role === 'owner') {
      if (name !== undefined) {
        room.name = name;
        await room.save();
      }
    }

    // Для всех пользователей (включая owner) обновляем кастомное имя в UserRoom
    if (name !== undefined) {
      userRoom.customName = name;
      await userRoom.save();
    }

    res.json({
      room: {
        id: room._id,
        roomId: room.roomId,
        name: userRoom.customName || room.name,
        ownerId: room.ownerId,
        isStatic: room.isStatic,
        customId: room.customId,
        createdAt: room.createdAt,
        role: userRoom.role,
      },
    });
  } catch (error) {
    console.error('Ошибка обновления комнаты:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить участников комнаты
exports.getRoomParticipants = async (req, res) => {
  try {
    const { roomId } = req.params;
    const ActiveConnection = require('../models/ActiveConnection');

    // Получаем активные подключения для комнаты
    const connections = await ActiveConnection.find({ 
      roomId, 
      isActive: true 
    }).sort({ createdAt: 1 });

    // Формируем список участников
    const participants = connections.map(conn => ({
      socketId: conn.socketId,
      userId: conn.userId,
      username: conn.username,
      mediaState: conn.mediaState,
      joinedAt: conn.createdAt,
      lastSeen: conn.lastSeen,
    }));

    res.json({
      roomId,
      count: participants.length,
      participants,
    });
  } catch (error) {
    console.error('Ошибка получения участников комнаты:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

