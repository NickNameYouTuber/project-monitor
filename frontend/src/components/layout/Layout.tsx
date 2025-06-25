import React from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, isDarkMode, toggleTheme } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Project Monitor
                </h1>
              </div>
              <nav className="ml-6 flex space-x-4">
                <button 
                  onClick={() => navigate('/dashboards')}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Dashboards
                </button>
              </nav>
            </div>
            
            {/* User menu & Dark mode toggle */}
            <div className="flex items-center">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors mr-2"
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                {isDarkMode ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <div className="ml-3 relative">
                <div className="flex items-center">
                  {currentUser?.avatar && (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={currentUser.avatar}
                      alt={currentUser.name}
                    />
                  )}
                  <span className="ml-2 text-gray-700 dark:text-gray-200">
                    {currentUser?.name || 'User'}
                  </span>
                  <button
                    onClick={logout}
                    className="ml-4 px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
