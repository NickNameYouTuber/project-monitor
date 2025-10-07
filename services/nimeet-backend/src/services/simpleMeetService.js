// backend/src/services/simpleMeetService.js - Простой WebRTC сервис (из meet-service)

const rooms = {}; // {roomId: [socketIds]}

const initializeSimpleMeetService = (io) => {
  // Создаем отдельный namespace для простых встреч
  const meetNamespace = io.of('/simple-meet');

  meetNamespace.on('connection', (socket) => {
    console.log('New socket connected to simple-meet', socket.id);

    socket.on('join-room', (roomId) => {
      console.log(`Socket ${socket.id} joining room ${roomId}`);
      socket.join(roomId);
      if (!rooms[roomId]) rooms[roomId] = [];
      rooms[roomId].push(socket.id);

      // Notify existing users in room about new user
      rooms[roomId].forEach(otherId => {
        if (otherId !== socket.id) {
          console.log(`Notifying ${otherId} about new user ${socket.id}`);
          meetNamespace.to(otherId).emit('user-joined', socket.id);
        }
      });
    });

    socket.on('offer', ({ offer, to, room, type }) => {
      console.log(`Forwarding ${type} offer from ${socket.id} to ${to} in room ${room}`);
      meetNamespace.to(to).emit('offer', { offer, from: socket.id, type });
    });

    socket.on('answer', ({ answer, to, room, type }) => {
      console.log(`Forwarding ${type} answer from ${socket.id} to ${to} in room ${room}`);
      meetNamespace.to(to).emit('answer', { answer, from: socket.id, type });
    });

    socket.on('ice-candidate', ({ candidate, to, room, type }) => {
      console.log(`Forwarding ${type} ICE candidate from ${socket.id} to ${to} in room ${room}`);
      meetNamespace.to(to).emit('ice-candidate', { candidate, from: socket.id, type });
    });

    socket.on('close-media', ({ type, room }) => {
      console.log(`Forwarding close-media ${type} from ${socket.id} in room ${room}`);
      socket.to(room).emit('close-media', { type, from: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected from simple-meet', socket.id);
      for (const roomId in rooms) {
        const index = rooms[roomId].indexOf(socket.id);
        if (index !== -1) {
          rooms[roomId].splice(index, 1);
          // Notify others in room
          rooms[roomId].forEach(otherId => {
            console.log(`Notifying ${otherId} about user left ${socket.id}`);
            meetNamespace.to(otherId).emit('user-left', socket.id);
          });
          if (rooms[roomId].length === 0) delete rooms[roomId];
          break;
        }
      }
    });
  });

  // API для получения информации о комнатах
  return {
    getRooms: () => {
      return Object.keys(rooms).map(roomId => ({
        roomId,
        participants: rooms[roomId].length
      }));
    }
  };
};

module.exports = initializeSimpleMeetService;
