// Заглушка authService для интеграции с project-monitor
// Использует существующую аутентификацию PM

export interface User {
  id: string;
  username: string;
  displayName?: string;
}

class AuthService {
  private tokenKey = 'access_token'; // используем ключ из PM

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Заглушка для получения текущего пользователя
  // В реальности данные берутся из контекста PM
  getCurrentUser(): User | null {
    const token = this.getToken();
    if (!token) return null;

    // Пытаемся получить данные пользователя из localStorage PM
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          id: user.id || user.user_id || 'unknown',
          username: user.username || user.login || 'Guest',
          displayName: user.display_name || user.displayName || user.username || 'Guest'
        };
      }
    } catch (e) {
      console.warn('Не удалось получить данные пользователя:', e);
    }

    return {
      id: 'guest',
      username: 'Guest',
      displayName: 'Guest'
    };
  }
}

export default new AuthService();
