// Хук useAuth для интеграции с project-monitor
import { useState, useEffect } from 'react';
import authService, { User } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  return {
    user,
    isAuthenticated
  };
};
