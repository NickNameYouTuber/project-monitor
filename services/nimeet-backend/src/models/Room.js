const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: '',
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Разрешаем null для гостевых комнат
    default: null,
  },
  isStatic: {
    type: Boolean,
    default: false,
  },
  customId: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  participants: [{
    type: String,
  }],
  activeParticipants: [{
    socketId: String,
    userId: String,
    username: String,
    mediaState: {
      camera: { type: Boolean, default: true },
      microphone: { type: Boolean, default: true },
      screen: { type: Boolean, default: false }
    },
    lastSeen: { type: Date, default: Date.now }
  }],
});

module.exports = mongoose.model('Room', roomSchema);

