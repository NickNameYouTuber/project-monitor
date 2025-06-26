import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isMounted } = useTheme();

  // Предотвращение проблем с SSR
  if (!isMounted) return null;

  const renderThemeIcon = () => {
    switch (theme) {
      case 'dark':
        // Иконка солнца для переключения с темной на мятную тему
        return (
          <svg
            className="w-5 h-5 text-state-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            ></path>
          </svg>
        );
      case 'mint':
        // Иконка листа мяты для мятной темы
        return (
          <svg 
            className="w-5 h-5 text-primary" 
            fill="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M19.2,6.8c-0.3-0.3-0.4-0.7-0.4-1.1c0-0.4,0.1-0.8,0.4-1.1c0.3-0.3,0.7-0.4,1.1-0.4c0.4,0,0.8,0.1,1.1,0.4
              s0.4,0.7,0.4,1.1c0,0.4-0.1,0.8-0.4,1.1s-0.7,0.4-1.1,0.4C19.9,7.3,19.5,7.1,19.2,6.8z M12.5,5c-0.2,0-0.4-0.1-0.6-0.2
              c-0.6-0.4-1.2-0.7-1.8-0.9C9.5,3.7,8.8,3.6,8.3,3.6c-0.5,0-0.9,0.1-1.4,0.2c-2.2,0.7-3.9,2.2-4.8,4.1C1.2,10,1,12.3,1.9,14.3
              c0.9,1.9,2.7,3.3,4.8,3.9c0.5,0.1,0.9,0.2,1.4,0.2c0.7,0,1.5-0.1,2.3-0.4c0.7-0.2,1.3-0.6,1.8-0.9c0.2-0.1,0.4-0.2,0.6-0.2
              c0.2,0,0.3,0,0.5,0.1c0.3,0.2,0.5,0.6,0.5,1v1c0,0.3-0.1,0.6-0.4,0.8c-0.2,0.2-0.5,0.3-0.8,0.3H5.8c-0.2,0-0.4,0.1-0.5,0.2
              C5.1,20.4,5,20.6,5,20.8c0,0.2,0.1,0.4,0.2,0.5c0.1,0.1,0.3,0.2,0.5,0.2h6.8c0.4,0,0.9-0.1,1.3-0.2c0.4-0.2,0.8-0.4,1.1-0.7
              c0.3-0.3,0.5-0.7,0.7-1.1c0.2-0.4,0.2-0.8,0.2-1.3v-1c0-0.7-0.1-1.4-0.5-1.9c-0.3-0.5-0.7-0.9-1.2-1.2
              c-0.5-0.3-1.1-0.4-1.6-0.4c-0.6,0-1.2,0.1-1.7,0.4c-0.6,0.3-1.1,0.6-1.7,0.8c-0.5,0.2-1,0.2-1.5,0.2c-0.2,0-0.4,0-0.6-0.1
              c-1.2-0.3-2.1-1.1-2.6-2.2S3.5,11.2,4,10c0.5-1.1,1.4-1.9,2.6-2.2C6.8,7.7,7,7.7,7.2,7.7c0.5,0,0.9,0.1,1.5,0.2
              c0.5,0.2,1.1,0.5,1.7,0.8c0.5,0.3,1.1,0.4,1.7,0.4c0.5,0,1.1-0.1,1.6-0.4c0.5-0.3,0.9-0.7,1.2-1.2c0.3-0.5,0.5-1.2,0.5-1.8V5
              c0-0.4-0.1-0.9-0.2-1.3c-0.2-0.4-0.4-0.8-0.7-1.1c-0.3-0.3-0.7-0.5-1.1-0.7c-0.4-0.2-0.8-0.2-1.3-0.2H5.8C5.6,1.5,5.4,1.6,5.3,1.8
              C5.1,1.9,5,2.1,5,2.3c0,0.2,0.1,0.4,0.2,0.5c0.1,0.1,0.3,0.2,0.5,0.2h6.8c0.3,0,0.5,0.1,0.8,0.3C13.5,3.4,13.6,3.7,13.6,4v1
              C13.6,5.4,13.4,5.7,13.1,5.9C12.9,6,12.7,6,12.5,5z" 
            />
          </svg>
        );
      default: // light theme
        // Иконка луны для переключения со светлой на темную тему
        return (
          <svg
            className="w-5 h-5 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            ></path>
          </svg>
        );
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-bg-secondary hover:bg-opacity-80 transition-colors duration-200 flex items-center justify-center"
      aria-label={`Switch theme: current theme is ${theme}`}
      title={`Current theme: ${theme} (click to change)`}
    >
      {renderThemeIcon()}
    </button>
  );
};

export default ThemeToggle;
