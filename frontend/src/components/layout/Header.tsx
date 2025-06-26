import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../utils/AppContext';
import ThemeToggle from '../ui/ThemeToggle';
import nitLogo from '../../assets/nit-logo.png';

interface HeaderProps {
  onAddProject: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddProject }) => {
  const { currentUser, logout } = useAppContext();
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
        <div className="flex items-center">
          <img src={nitLogo} alt="NitLogo" className="h-10 mr-2" />
        </div>
        <div className="flex items-center space-x-3">
          {/* Theme Toggle Button - новая версия */}
          <ThemeToggle />
          
          {/* User Panel */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 bg-primary/10 dark:bg-primary/20 px-3 py-2 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <i className="fas fa-user text-white text-sm"></i>
                )}
              </div>
              <span className="text-sm font-medium text-primary">
                {currentUser?.name || 'Guest User'}
              </span>
              <i className="fas fa-chevron-down text-primary text-xs"></i>
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
                  <i className="fas fa-user-circle mr-3 text-primary"></i>
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
            className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-semibold transition duration-200"
          >
            <i className="fas fa-plus mr-2"></i>Add Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
