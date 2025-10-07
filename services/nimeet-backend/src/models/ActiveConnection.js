const mongoose = require('mongoose');

const activeConnectionSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true,
    unique: true,
  },
  roomId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  mediaState: {
    camera: { type: Boolean, default: true },
    microphone: { type: Boolean, default: true },
    screen: { type: Boolean, default: false }
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Индексы для быстрого поиска
activeConnectionSchema.index({ roomId: 1 });
activeConnectionSchema.index({ userId: 1 });
activeConnectionSchema.index({ socketId: 1 });

module.exports = mongoose.model('ActiveConnection', activeConnectionSchema);
