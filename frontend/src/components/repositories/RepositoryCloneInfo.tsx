import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface CloneInfo {
  ssh_url: string;
  https_url: string;
  web_url: string;
  clone_instructions: {
    https: string;
    ssh: string;
    setup: string;
  };
}

interface RepositoryCloneInfoProps {
  repositoryId: string;
}

const RepositoryCloneInfo: React.FC<RepositoryCloneInfoProps> = ({ repositoryId }) => {
  const [cloneInfo, setCloneInfo] = useState<CloneInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchCloneInfo = async () => {
      if (!repositoryId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(`/repositories/${repositoryId}/clone-info`);
        setCloneInfo(response.data);
      } catch (err: any) {
        console.error('Error fetching clone info:', err);
        setError(err.message || 'Failed to load clone information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCloneInfo();
  }, [repositoryId]);

  const copyToClipboard = (content: string, message: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setNotification(message);
      setTimeout(() => setNotification(null), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg p-4 shadow-sm border border-[var(--border-primary)] mb-6">
        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-[var(--bg-tertiary)] rounded mb-2"></div>
      </div>
    );
  }

  if (error || !cloneInfo) {
    return (
      <div className="bg-[var(--state-error-light)] rounded-lg p-4 shadow-sm border border-[var(--state-error)] mb-6">
        <p className="text-[var(--state-error)]">{error || 'Failed to load clone information'}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-4 shadow-sm border border-[var(--border-primary)] mb-6">
      <h3 className="text-lg font-medium mb-3 text-[var(--text-primary)]">Clone Repository</h3>
      <p className="text-[var(--text-muted)] mb-3">Use one of the following methods to clone this repository:</p>
      
      <div className="space-y-4">
        {/* HTTPS Clone */}
        <div>
          <h4 className="font-medium text-[var(--text-primary)] mb-1">Clone with HTTPS</h4>
          <p className="text-sm text-[var(--text-muted)] mb-1">Use Git or checkout with SVN using the web URL.</p>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={cloneInfo.https_url} 
              className="flex-grow p-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button 
              onClick={() => copyToClipboard(cloneInfo.https_url, 'HTTPS URL copied to clipboard!')}
              className="px-3 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-[var(--text-primary)] rounded-md text-sm"
            >
              Copy
            </button>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">{cloneInfo.clone_instructions.https}</div>
        </div>
        
        {/* SSH Clone */}
        <div>
          <h4 className="font-medium text-[var(--text-primary)] mb-1">Clone with SSH</h4>
          <p className="text-sm text-[var(--text-muted)] mb-1">Use a terminal with SSH key authentication.</p>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={cloneInfo.ssh_url} 
              className="flex-grow p-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button 
              onClick={() => copyToClipboard(cloneInfo.ssh_url, 'SSH URL copied to clipboard!')}
              className="px-3 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-[var(--text-primary)] rounded-md text-sm"
            >
              Copy
            </button>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">{cloneInfo.clone_instructions.ssh}</div>
        </div>
        
        {/* Web URL */}
        <div>
          <h4 className="font-medium text-[var(--text-primary)] mb-1">Open in Browser</h4>
          <p className="text-sm text-[var(--text-muted)] mb-1">View the repository in your browser.</p>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={cloneInfo.web_url} 
              className="flex-grow p-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button 
              onClick={() => copyToClipboard(cloneInfo.web_url, 'Web URL copied to clipboard!')}
              className="px-3 py-2 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-[var(--text-primary)] rounded-md text-sm"
            >
              Copy
            </button>
            <a 
              href={cloneInfo.web_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-md text-sm"
            >
              Open
            </a>
          </div>
        </div>
      </div>
      
      {notification && (
        <div className="mt-3 p-2 bg-[var(--state-success-light)] text-[var(--state-success)] rounded-md text-sm">
          {notification}
        </div>
      )}
    </div>
  );
};

export default RepositoryCloneInfo;
