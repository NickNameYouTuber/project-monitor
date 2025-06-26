import React from 'react';
import { Link } from 'react-router-dom';

interface BackButtonProps {
  text: string;
  link: string;
}

interface ActionButtonProps {
  text: string;
  link: string;
  variant?: 'primary' | 'secondary';
}

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  backButton?: BackButtonProps;
  actionButton?: ActionButtonProps;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backButton,
  actionButton
}) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-start">
        <div>
          {backButton && (
            <Link 
              to={backButton.link}
              className="inline-flex items-center text-text-tertiary hover:text-primary mb-2"
            >
              <svg 
                className="h-4 w-4 mr-1" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path d="M15 19l-7-7 7-7"></path>
              </svg>
              {backButton.text}
            </Link>
          )}
          
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          
          {subtitle && (
            <div className="mt-1 text-text-secondary">
              {subtitle}
            </div>
          )}
        </div>
        
        {actionButton && (
          <Link
            to={actionButton.link}
            className={`
              px-4 py-2 rounded font-medium
              ${actionButton.variant === 'secondary' 
                ? 'border border-border text-text-primary hover:bg-bg-tertiary' 
                : 'bg-primary hover:bg-primary-dark text-white'}
            `}
          >
            {actionButton.text}
          </Link>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
