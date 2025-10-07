const mongoose = require('mongoose');

const userRoomSchema = new mongoose.Schema({
  userId: {
    type: String, // Изменено на String для совместимости с PM (PostgreSQL UUID/Long)
    required: true,
  },
  roomId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'member'],
    default: 'member',
  },
  customName: {
    type: String,
    default: '',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessed: {
    type: Date,
    default: Date.now,
  },
});

// Составной индекс для уникальности пары userId-roomId
userRoomSchema.index({ userId: 1, roomId: 1 }, { unique: true });

// Индекс для быстрого поиска комнат пользователя
userRoomSchema.index({ userId: 1 });

// Индекс для поиска владельца комнаты
userRoomSchema.index({ roomId: 1, role: 1 });

module.exports = mongoose.model('UserRoom', userRoomSchema);
