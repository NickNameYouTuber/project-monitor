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
              className="inline-flex items-center text-[var(--text-muted)] hover:text-[var(--color-primary)] mb-2"
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
          
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
          
          {subtitle && (
            <div className="mt-1 text-[var(--text-secondary)]">
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
                ? 'border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]' 
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'}
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
