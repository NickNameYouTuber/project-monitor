const express = require('express');
const router = express.Router();

module.exports = (io) => {
  router.post('/call-starting', (req, res) => {
    const { userId, callId, title, roomId } = req.body;
    
    console.log(`📢 Получен запрос на отправку уведомления о начале звонка`);
    console.log(`   userId: ${userId}`);
    console.log(`   callId: ${callId}`);
    console.log(`   title: ${title}`);
    console.log(`   roomId: ${roomId}`);
    
    const socketsInRoom = io.sockets.adapter.rooms.get(userId);
    console.log(`   Сокетов в комнате ${userId}: ${socketsInRoom ? socketsInRoom.size : 0}`);
    
    io.to(userId).emit('call-starting', {
      callId,
      title,
      roomId
    });
    
    console.log(`✅ Уведомление отправлено через Socket.IO`);
    
    res.json({ success: true, socketsCount: socketsInRoom ? socketsInRoom.size : 0 });
  });
  
  router.post('/call-reminder', (req, res) => {
    const { userId, callId, title, minutesUntil } = req.body;
    
    console.log(`📢 Отправка напоминания о звонке пользователю ${userId} (через ${minutesUntil} мин)`);
    
    io.to(userId).emit('call-reminder', {
      callId,
      title,
      minutesUntil
    });
    
    res.json({ success: true });
  });
  
  return router;
};

