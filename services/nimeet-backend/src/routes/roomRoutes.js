const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, roomController.createRoom);
router.get('/user/rooms', authMiddleware, roomController.getUserRooms);
router.get('/:roomId', roomController.getRoomInfo);
router.get('/:roomId/participants', roomController.getRoomParticipants);
router.delete('/:roomId', authMiddleware, roomController.deleteRoom);
router.patch('/:roomId', authMiddleware, roomController.updateRoom);

module.exports = router;

