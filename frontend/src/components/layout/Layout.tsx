import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, isDarkMode, toggleTheme } = useAppContext();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and hamburger menu for mobile */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Project Monitor
                </h1>
              </div>
              
              {/* Navigation for desktop */}
              <nav className="hidden md:ml-6 md:flex md:space-x-4">
                <button 
                  onClick={() => navigate('/dashboards')}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Dashboards
                </button>
              </nav>
              
              {/* Mobile menu button */}
              <div className="-mr-2 flex md:hidden ml-4">
                <button
                  onClick={toggleMobileMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
                  aria-expanded="false"
                >
                  <span className="sr-only">Open main menu</span>
                  {/* Icon when menu is closed */}
                  {!isMobileMenuOpen ? (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* User menu & Dark mode toggle - desktop */}
            <div className="hidden md:flex md:items-center">
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
        
        {/* Mobile menu, show/hide based on menu state */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-800 shadow-md">
              <button
                onClick={() => {
                  navigate('/dashboards');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Dashboards
              </button>
              
              {/* Dark mode toggle in mobile menu */}
              <div className="flex items-center px-3 py-2">
                <span className="text-gray-700 dark:text-white mr-2">Theme:</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-md text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                >
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
              
              {/* User info and logout in mobile menu */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                <div className="flex items-center px-3 py-2">
                  {currentUser?.avatar && (
                    <img
                      className="h-8 w-8 rounded-full mr-2"
                      src={currentUser.avatar}
                      alt={currentUser.name}
                    />
                  )}
                  <span className="text-gray-700 dark:text-white">
                    {currentUser?.name || 'User'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-red-500 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-700 dark:hover:text-red-300 rounded-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
