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
    <header className="mb-8">
      <div className="flex justify-between items-start">
        <div>
          {backButton && (
            <Link 
              to={backButton.link}
              className="inline-flex items-center text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] mb-4 bg-[var(--bg-secondary)] px-3 py-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <svg 
                className="w-4 h-4 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {backButton.text}
            </Link>
          )}
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 bg-[var(--bg-card)] p-3 rounded-lg border-l-2 border-[var(--color-primary)]">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
            {subtitle && (
              <div className="text-sm text-[var(--text-muted)]">
                {subtitle}
              </div>
            )}
          </div>
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
    </header>
  );
};

export default PageHeader;
