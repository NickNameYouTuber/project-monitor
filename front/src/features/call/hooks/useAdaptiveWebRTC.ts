/**
 * Adaptive WebRTC Hook
 * Автоматически выбирает между Mesh P2P и MediaSoup SFU
 * на основе переменной окружения USE_MEDIASOUP
 */

import { useWebRTC } from './useWebRTC';
import { useMediasoupWebRTC } from './useMediasoupWebRTC';
import socketService from '../services/socketService';

// Переменная окружения для переключения режима
const USE_MEDIASOUP = process.env.REACT_APP_USE_MEDIASOUP === 'true';

export function useAdaptiveWebRTC(roomId: string, guestName?: string) {
  const socket = socketService.getSocket();
  
  // Get user info (если нужен для MediaSoup)
  const username = guestName || 'User';
  const userId = 'user-' + Date.now(); // Временное решение, нужно брать из auth

  console.log(`🔧 WebRTC Mode: ${USE_MEDIASOUP ? 'MediaSoup SFU' : 'Mesh P2P'}`);

  // Вызываем оба hooks всегда (для соблюдения правил React Hooks)
  const mediasoupResult = useMediasoupWebRTC(socket, roomId, username, userId);
  const meshResult = useWebRTC(roomId, guestName);

  // Возвращаем нужный результат на основе конфигурации
  return USE_MEDIASOUP ? mediasoupResult : meshResult;
}

export default useAdaptiveWebRTC;

