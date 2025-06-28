import React, { useState } from 'react';
import { useAppContext } from '../../utils/AppContext';
import type { User } from '../../types';
import TelegramLoginWidget from './TelegramLoginWidget';
import { Link } from 'react-router-dom';

const AuthScreen: React.FC = () => {
  const { login } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  // API URL - would come from env in production
  const API_URL = import.meta.env.VITE_API_URL || 'https://projectsmonitor.nicorp.tech/api';
  
  // Function to handle Telegram authentication using the Login Widget
  const handleTelegramAuth = async (telegramUser: any) => {
    setIsLoading(true);
    try {
      console.log('Received Telegram user data:', telegramUser);
      
      // Prepare auth data for backend using the data from Telegram Login Widget
      const authData = {
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || '',
        username: telegramUser.username || '',
        photo_url: telegramUser.photo_url || '',
        init_data: '', // Not used with Login Widget
        auth_date: telegramUser.auth_date,
        hash: telegramUser.hash
      };
      
      console.log('Sending auth data to backend:', authData);
      
      // Send to backend with mode: 'cors' explicitly set
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify(authData)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Convert backend user data to frontend User format
        const userData: User = {
          id: data.user.id,
          name: `${data.user.first_name} ${data.user.last_name || ''}`.trim(),
          username: data.user.username,
          avatar: data.user.avatar_url,
          type: 'telegram',
          token: data.access_token // Store the JWT token
        };
        // Store token in localStorage for API requests
        localStorage.setItem('auth_token', data.access_token);
        login(userData);
      } else {
        // Handle non-OK responses
        try {
          const errorData = await response.json();
          console.error('Telegram auth failed:', errorData);
          alert(`Authentication failed: ${errorData.detail || 'Unknown error'}`);
        } catch (e) {
          console.error('Failed to parse error response:', e);
          alert(`Authentication failed: Server returned ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      alert('Failed to authenticate with Telegram. Please try again or continue as guest.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get bot name from environment variables
  const BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ProjectMonitorBot';

  return (
    <div className="min-h-screen bg-white">
      {/* Навигация */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/10 backdrop-blur-md">
        <Link to="/" className="text-[#7AB988] text-2xl font-bold">NIT</Link>
      </nav>

      {/* Основной контент */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4 border border-[#7AB988]/10">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#3A6642] flex flex-wrap justify-center gap-x-2 mb-2">
              <span className="relative">
                <span className="text-[#7AB988]">N</span>eural
              </span>
              <span>
                <span className="text-[#7AB988]">I</span>nformation
              </span>
              <span>
                <span className="text-[#7AB988]">T</span>racker
              </span>
            </h1>
            <p className="text-[#4C8858] mt-2">Эффективное управление проектами и задачами</p>
          </div>

          {/* Форма входа */}
          <div className="bg-white/60 p-6 rounded-xl border border-[#7AB988]/20 shadow-md">
            <h2 className="text-[#4C8858] text-xl font-semibold mb-4 text-center">Вход в систему</h2>
            
            <div className="flex justify-center mb-4">
              <TelegramLoginWidget
                botName={BOT_NAME}
                dataOnauth={handleTelegramAuth}
                buttonSize="large"
                cornerRadius={10}
                requestAccess={true}
              />
            </div>

            {isLoading && (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7AB988]"></div>
                <span className="ml-3 text-[#4C8858]">Аутентификация...</span>
              </div>
            )}
          </div>

          {/* Ссылка для поддержки */}
          <div className="mt-6 text-center text-sm">
            <span className="text-[#4C8858]">
              Нужна помощь? <a href="#" className="text-[#7AB988] hover:underline transition-colors">Свяжитесь с поддержкой</a>
            </span>
          </div>

          {/* Ссылка на главную */}
          <div className="mt-4 text-center">
            <Link to="/" className="text-[#5DA570] hover:text-[#7AB988] text-sm transition-colors">
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
