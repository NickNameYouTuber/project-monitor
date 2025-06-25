import React from 'react';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClick, className = '', ariaLabel = 'Close' }) => {
  return (
    <button 
      onClick={onClick}
      className={`inline-flex items-center justify-center p-2 rounded-md 
        text-gray-700 dark:text-white bg-white dark:bg-gray-800 
        hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 
        dark:hover:bg-gray-700 focus:outline-none transition-colors ${className}`}
      aria-label={ariaLabel}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
};

export default CloseButton;
