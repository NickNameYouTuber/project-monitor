import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isMounted } = useTheme();

  // Предотвращение проблем с SSR
  if (!isMounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-bg-secondary hover:bg-opacity-80 transition-colors duration-200 flex items-center justify-center"
      aria-label="Toggle Dark Mode"
      title={`Current theme: ${theme} (click to change)`}
    >
      {theme === 'dark' ? (
        // Иконка солнца для светлого режима
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
      ) : (
        // Иконка луны для темного режима
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
      )}
    </button>
  );
};

export default ThemeToggle;
