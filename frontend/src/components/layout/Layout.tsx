import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import ThemeToggle from '../ui/ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout } = useAppContext();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen w-full bg-bg-primary transition-colors duration-300">
      {/* Header */}
      <header className="bg-bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-text-primary">
                  NIT
                </h1>
              </div>
              
              {/* Navigation for desktop */}
              <nav className="hidden md:ml-6 md:flex md:space-x-4">
                <button 
                  onClick={() => navigate('/dashboards')}
                  className="px-4 py-2 rounded-md text-sm font-medium text-text-primary bg-bg-card hover:bg-bg-hover transition-colors"
                >
                  Dashboards
                </button>
              </nav>
            </div>
            
            {/* Mobile menu button - moved to right */}
            <div className="flex md:hidden items-center">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-text-primary bg-bg-card hover:text-text-primary hover:bg-bg-hover focus:outline-none"
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
            
            {/* User menu & Dark mode toggle - desktop */}
            <div className="hidden md:flex md:items-center">
              <ThemeToggle />
              <div className="ml-3 relative">
                <div className="flex items-center">
                  {currentUser?.avatar && (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={currentUser.avatar}
                      alt={currentUser.name}
                    />
                  )}
                  <span className="ml-2 text-text-primary">
                    {currentUser?.name || 'User'}
                  </span>
                  <button
                    onClick={logout}
                    className="ml-4 px-3 py-1 text-sm bg-bg-card hover:bg-bg-hover text-text-primary rounded-md"
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
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-bg-card shadow-md">
              <button
                onClick={() => {
                  navigate('/dashboards');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-text-primary bg-bg-card hover:bg-bg-hover"
              >
                Dashboards
              </button>
              
              {/* Dark mode toggle in mobile menu */}
              <div className="flex items-center px-3 py-2">
                <span className="text-text-primary mr-2">Theme:</span>
                <ThemeToggle />
              </div>
              
              {/* User info and logout in mobile menu */}
              <div className="border-t border-border-primary pt-2">
                <div className="flex items-center px-3 py-2">
                  {currentUser?.avatar && (
                    <img
                      className="h-8 w-8 rounded-full mr-2"
                      src={currentUser.avatar}
                      alt={currentUser.name}
                    />
                  )}
                  <span className="text-text-primary">
                    {currentUser?.name || 'User'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-text-primary bg-bg-card hover:bg-bg-hover rounded-md"
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
