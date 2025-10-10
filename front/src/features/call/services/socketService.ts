import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { Participant } from '../types/call.types';

export type ConnectionType = 'audio' | 'video' | 'screen';

class SocketService {
  private socket: Socket | null = null;
  private lastRoomId: string | null = null;
  private lastUserData: { userId: string; username: string } | null = null;

  connect(token: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, // Увеличено с 500 до 1000
      reconnectionDelayMax: 10000, // Увеличено с 5000 до 10000
      timeout: 20000, // Таймаут подключения 20 секунд
    });

    this.socket.on('connect', () => {
      console.log('Socket подключен:', this.socket?.id);
      console.log('Transport:', (this.socket?.io as any)?.engine?.transport?.name);
      // Автоматически присоединяемся к комнате при подключении, если есть сохраненные данные
      if (this.lastRoomId && this.lastUserData) {
        console.log('🔄 Автоматическое присоединение к комнате при подключении:', this.lastRoomId);
        this.joinRoom(this.lastRoomId, this.lastUserData);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket отключен. Причина:', reason);
      console.log('Transport был:', (this.socket?.io as any)?.engine?.transport?.name);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Ошибка подключения Socket:', error.message);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Попытка переподключения #${attempt}...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Не удалось переподключиться к Socket.IO');
    });

    this.socket.on('reconnect', (attempt) => {
      console.log('Socket переподключен. Попытка:', attempt);
      if (this.lastRoomId && this.lastUserData) {
        this.joinRoom(this.lastRoomId, this.lastUserData);
      }
    });

    return this.socket;
  }

  connectAsGuest(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, // Увеличено с 500 до 1000
      reconnectionDelayMax: 10000, // Увеличено с 5000 до 10000
      timeout: 20000, // Таймаут подключения 20 секунд
    });

    this.socket.on('connect', () => {
      console.log('Socket подключен (гость):', this.socket?.id);
      console.log('Transport:', (this.socket?.io as any)?.engine?.transport?.name);
      // Автоматически присоединяемся к комнате при подключении, если есть сохраненные данные
      if (this.lastRoomId && this.lastUserData) {
        console.log('🔄 Автоматическое присоединение к комнате при подключении (гость):', this.lastRoomId);
        this.joinRoom(this.lastRoomId, this.lastUserData);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket отключен (гость). Причина:', reason);
      console.log('Transport был:', (this.socket?.io as any)?.engine?.transport?.name);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Ошибка подключения Socket (гость):', error.message);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Попытка переподключения (гость) #${attempt}...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Не удалось переподключиться к Socket.IO (гость)');
    });

    this.socket.on('reconnect', (attempt) => {
      console.log('Socket переподключен (гость). Попытка:', attempt);
      if (this.lastRoomId && this.lastUserData) {
        this.joinRoom(this.lastRoomId, this.lastUserData);
      }
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinRoom(roomId: string, userData: { userId: string; username: string }): void {
    // Запоминаем контекст для автопереподключения
    this.lastRoomId = roomId;
    this.lastUserData = userData;
    this.socket?.emit('join-room', { roomId, userData });
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('leave-room', { roomId });
  }

  sendOffer(targetSocketId: string, offer: RTCSessionDescriptionInit, connectionType: ConnectionType): void {
    this.socket?.emit('offer', { targetSocketId, offer, connectionType });
  }

  sendAnswer(targetSocketId: string, answer: RTCSessionDescriptionInit, connectionType: ConnectionType): void {
    this.socket?.emit('answer', { targetSocketId, answer, connectionType });
  }

  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit, connectionType: ConnectionType): void {
    this.socket?.emit('ice-candidate', { targetSocketId, candidate, connectionType });
  }

  toggleMedia(roomId: string, mediaType: 'camera' | 'microphone' | 'screen', enabled: boolean): void {
    this.socket?.emit('toggle-media', { roomId, mediaType, enabled });
  }

  notifyScreenShareStarted(roomId: string, screenStreamId: string): void {
    this.socket?.emit('screen-share-started', { roomId, screenStreamId });
  }

  notifyScreenShareStopped(roomId: string): void {
    this.socket?.emit('screen-share-stopped', { roomId });
  }

  onUserJoined(callback: (data: { participant: Participant }) => void): void {
    this.socket?.on('user-joined', callback);
  }

  onExistingParticipants(callback: (data: { participants: Participant[]; raisedHands?: string[] }) => void): void {
    this.socket?.on('existing-participants', callback);
  }

  onUserLeft(callback: (data: { socketId: string }) => void): void {
    this.socket?.on('user-left', callback);
  }

  onReceiveOffer(callback: (data: { from: string; offer: RTCSessionDescriptionInit; connectionType: ConnectionType }) => void): void {
    this.socket?.on('receive-offer', callback);
  }

  onReceiveAnswer(callback: (data: { from: string; answer: RTCSessionDescriptionInit; connectionType: ConnectionType }) => void): void {
    this.socket?.on('receive-answer', callback);
  }

  onReceiveIceCandidate(callback: (data: { from: string; candidate: RTCIceCandidateInit; connectionType: ConnectionType }) => void): void {
    this.socket?.on('receive-ice-candidate', callback);
  }

  onScreenShareStarted(callback: (data: { socketId: string; screenStreamId: string }) => void): void {
    this.socket?.on('screen-share-started', callback);
  }

  onScreenShareStopped(callback: (data: { socketId: string }) => void): void {
    this.socket?.on('screen-share-stopped', callback);
  }

  onMediaToggled(callback: (data: { socketId: string; mediaType: string; enabled: boolean }) => void): void {
    this.socket?.on('media-toggled', callback);
  }

  onRoomNotFound(callback: (data: { roomId: string }) => void): void {
    this.socket?.on('room-not-found', callback);
  }

  onRoomError(callback: (data: { message: string }) => void): void {
    this.socket?.on('room-error', callback);
  }

  offAllListeners(): void {
    this.socket?.off('user-joined');
    this.socket?.off('existing-participants');
    this.socket?.off('user-left');
    this.socket?.off('receive-offer');
    this.socket?.off('receive-answer');
    this.socket?.off('receive-ice-candidate');
    this.socket?.off('media-toggled');
    this.socket?.off('screen-share-started');
    this.socket?.off('screen-share-stopped');
    this.socket?.off('room-not-found');
    this.socket?.off('room-error');
  }

  /**
   * Получить текущую комнату
   */
  getCurrentRoomId(): string | null {
    return this.lastRoomId;
  }

  /**
   * Универсальные методы для работы с socket events
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  emit(event: string, ...args: any[]): void {
    this.socket?.emit(event, ...args);
  }
}

const socketService = new SocketService();
export default socketService;

