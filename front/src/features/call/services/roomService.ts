// Заглушка roomService для интеграции с project-monitor
// Комнаты создаются динамически на основе roomId

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
}

class RoomService {
  // Заглушка для получения или создания комнаты
  async getOrCreateRoom(roomId: string): Promise<Room> {
    // В project-monitor комнаты создаются автоматически при подключении
    return {
      id: roomId,
      name: `Room ${roomId}`,
      createdAt: new Date()
    };
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    return {
      id: roomId,
      name: `Room ${roomId}`,
      createdAt: new Date()
    };
  }
}

export default new RoomService();
