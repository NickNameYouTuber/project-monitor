import React, { useState } from 'react';
import { useAppContext } from '../../utils/AppContext';
import type { User } from '../../types';
import TelegramLoginWidget from './TelegramLoginWidget';

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
  
  // Удалены неиспользуемые функции useTestLogin и handleGuestAuth

  // Get bot name from environment variables
  const BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ProjectMonitorBot';

  return (
    <div className="fixed inset-0 auth-container flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="flex items-center mb-2">
            <img src="/nit-logo.png" alt="NIT Logo" className="w-20 h-20 mx-auto" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">Эффективное управление проектами и задачами</p>
        </div>
        
        <div className="space-y-6">
          <div className="flex justify-center">
            {/* Telegram Login Widget */}
            <TelegramLoginWidget
              botName={BOT_NAME}
              dataOnauth={handleTelegramAuth}
              buttonSize="large"
              cornerRadius={10}
              requestAccess={true}
            />
          </div>
          
          {/* Guest login temporarily disabled */}
          {/* <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
            </div>
          </div>
          
          <button 
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-6 py-4 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Continue as Guest
          </button> */}
        </div>
        
        {isLoading && (
          <div className="text-center mt-6">
            <div className="loading-spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-300">Authenticating...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
