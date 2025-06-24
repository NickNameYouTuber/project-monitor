import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../utils/AppContext';

interface HeaderProps {
  onAddProject: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddProject }) => {
  const { currentUser, logout, isDarkMode, toggleTheme } = useAppContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle profile button click
  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    alert('Profile settings coming soon!');
  };

  // Handle preferences button click
  const handlePreferencesClick = () => {
    setIsDropdownOpen(false);
    alert('Preferences coming soon!');
  };

  // Handle logout button click
  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    if (confirm('Are you sure you want to sign out?')) {
      // Force redirect to auth screen by logging out
      logout();
      // Ensure the UI updates
      window.location.reload();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Project Monitor</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Track your team projects and personal goals</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="theme-toggle w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          
          {/* User Panel */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <i className="fas fa-user text-white text-sm"></i>
                )}
              </div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {currentUser?.name || 'Guest User'}
              </span>
              <i className="fas fa-chevron-down text-blue-600 dark:text-blue-400 text-xs"></i>
            </button>
            
            {/* Dropdown Menu */}
            <div 
              className={`user-dropdown absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 ${isDropdownOpen ? 'show' : 'hidden'}`}
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {currentUser?.name || 'Guest User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentUser?.type === 'guest' ? 'Guest Account' : 'Telegram Account'}
                </p>
              </div>
              <div className="py-2">
                <button 
                  onClick={handleProfileClick}
                  className="w-full text-left px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
                >
                  <i className="fas fa-user-circle mr-3 text-blue-500 dark:text-blue-400"></i>
                  Profile Settings
                </button>
                <button 
                  onClick={handlePreferencesClick}
                  className="w-full text-left px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
                >
                  <i className="fas fa-cog mr-3 text-gray-500 dark:text-gray-400"></i>
                  Preferences
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button 
                  onClick={handleLogoutClick}
                  className="w-full text-left px-4 py-2 text-sm bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition flex items-center"
                >
                  <i className="fas fa-sign-out-alt mr-3"></i>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          
          {/* Add Project Button */}
          <button 
            onClick={onAddProject}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition duration-200"
          >
            <i className="fas fa-plus mr-2"></i>Add Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
