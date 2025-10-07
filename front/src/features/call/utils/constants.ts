// Константы для звонков в project-monitor

// Socket.IO URL - используем относительный путь, так как проксируется через Nginx
export const SOCKET_URL = window.location.origin;

// API Base URL для NIMeet API
export const API_BASE_URL = window.location.origin + '/meet-api';

// TURN сервер конфигурация
export const TURN_CONFIG = {
  urls: import.meta.env.VITE_TURN_URL || 'turn:nit.nicorp.tech:3478',
  username: import.meta.env.VITE_TURN_USER || 'test',
  credential: import.meta.env.VITE_TURN_PASS || 'test'
};

// ICE серверы
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  TURN_CONFIG,
  { 
    urls: `${TURN_CONFIG.urls}?transport=tcp`,
    username: TURN_CONFIG.username,
    credential: TURN_CONFIG.credential
  }
];
