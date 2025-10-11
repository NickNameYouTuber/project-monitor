const express = require('express');
const router = express.Router();

module.exports = (io) => {
  router.post('/call-starting', (req, res) => {
    const { userId, callId, title, roomId } = req.body;
    
    console.log(`📢 Отправка уведомления о начале звонка пользователю ${userId}`);
    
    io.to(userId).emit('call-starting', {
      callId,
      title,
      roomId
    });
    
    res.json({ success: true });
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

