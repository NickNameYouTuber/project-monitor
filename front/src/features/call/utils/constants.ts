// Константы для звонков в project-monitor

// Socket.IO URL - используем проксирование через nginx в production, прямой URL в dev
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    console.log('🔧 Используется VITE_SOCKET_URL:', import.meta.env.VITE_SOCKET_URL);
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  const isDev = import.meta.env.MODE === 'development' || 
                import.meta.env.DEV || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';
  
  const url = isDev ? 'http://localhost:4000' : window.location.origin;
  console.log('🔧 Socket URL определен:', url, 'isDev:', isDev, 'MODE:', import.meta.env.MODE, 'DEV:', import.meta.env.DEV);
  return url;
};

export const SOCKET_URL = getSocketUrl();

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
