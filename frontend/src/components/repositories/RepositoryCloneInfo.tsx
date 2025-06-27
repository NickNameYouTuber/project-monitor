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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'https' | 'ssh' | 'setup'>('https');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const fetchCloneInfo = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/repositories/${repositoryId}/clone-info`);
        setCloneInfo(response.data);
      } catch (err) {
        console.error('Error fetching clone info:', err);
        setError('Failed to load repository clone information.');
      } finally {
        setLoading(false);
      }
    };

    fetchCloneInfo();
  }, [repositoryId]);

  const handleTabChange = (tab: 'https' | 'ssh' | 'setup') => {
    setActiveTab(tab);
  };

  const handleCopyClick = () => {
    if (!cloneInfo) return;

    let contentToCopy = '';
    
    switch (activeTab) {
      case 'https':
        contentToCopy = cloneInfo.clone_instructions.https;
        break;
      case 'ssh':
        contentToCopy = cloneInfo.clone_instructions.ssh;
        break;
      case 'setup':
        contentToCopy = cloneInfo.clone_instructions.setup;
        break;
    }

    navigator.clipboard.writeText(contentToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-primary)] shadow rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-[var(--bg-secondary)] rounded mb-2"></div>
      </div>
    );
  }

  if (error || !cloneInfo) {
    return (
      <div className="bg-[var(--state-error-light)] border border-[var(--state-error)] rounded-lg p-4 text-[var(--state-error)]">
        {error || 'Failed to load clone information.'}
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Clone Repository</h3>
      
      <div className="flex border-b border-[var(--border-primary)] mb-4">
        <button
          onClick={() => handleTabChange('https')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'https' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          HTTPS
        </button>
        <button
          onClick={() => handleTabChange('ssh')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'ssh' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          SSH
        </button>
        <button
          onClick={() => handleTabChange('setup')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'setup' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          Setup Instructions
        </button>
      </div>

      <div className="relative">
        <pre className="bg-[var(--bg-secondary)] p-4 rounded-lg text-sm text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap">
          {activeTab === 'https' && cloneInfo.clone_instructions.https}
          {activeTab === 'ssh' && cloneInfo.clone_instructions.ssh}
          {activeTab === 'setup' && cloneInfo.clone_instructions.setup.split('\\n').join('\n')}
        </pre>
        <button
          onClick={handleCopyClick}
          className="absolute top-2 right-2 px-2 py-1 bg-[var(--bg-button)] text-[var(--text-primary)] rounded text-xs hover:bg-[var(--bg-button-hover)]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {activeTab === 'https' && (
        <div className="mt-4 text-sm text-[var(--text-muted)]">
          <p>Use HTTPS to clone without setting up SSH keys. You'll need to enter your username and password each time you push.</p>
        </div>
      )}
      {activeTab === 'ssh' && (
        <div className="mt-4 text-sm text-[var(--text-muted)]">
          <p>SSH is recommended for developers who regularly push to the repository. It requires setting up SSH keys but doesn't require entering credentials each time.</p>
        </div>
      )}
    </div>
  );
};

export default RepositoryCloneInfo;
