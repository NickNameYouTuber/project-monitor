// Хук useAuth для интеграции с project-monitor
import { useState, useEffect } from 'react';
import authService, { User } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Получаем реальные данные пользователя из PM
    const token = authService.getToken();
    
    if (token) {
      try {
        // Декодируем JWT токен для получения данных пользователя
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        const userData: User = {
          id: payload.sub || payload.userId || payload.id,
          username: payload.username || payload.login || 'User',
          displayName: payload.displayName || payload.username || 'User'
        };
        
        setUser(userData);
        setIsAuthenticated(true);
      } catch (e) {
        console.warn('Не удалось декодировать токен:', e);
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  return {
    user,
    isAuthenticated
  };
};
