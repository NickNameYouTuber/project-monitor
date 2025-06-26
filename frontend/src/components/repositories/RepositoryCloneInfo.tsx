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
      <div className="bg-white shadow rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-2"></div>
      </div>
    );
  }

  if (error || !cloneInfo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        {error || 'Failed to load clone information.'}
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Clone Repository</h3>
      
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => handleTabChange('https')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'https' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'}`}
        >
          HTTPS
        </button>
        <button
          onClick={() => handleTabChange('ssh')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'ssh' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'}`}
        >
          SSH
        </button>
        <button
          onClick={() => handleTabChange('setup')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'setup' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'}`}
        >
          Setup Instructions
        </button>
      </div>

      <div className="relative">
        <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap">
          {activeTab === 'https' && cloneInfo.clone_instructions.https}
          {activeTab === 'ssh' && cloneInfo.clone_instructions.ssh}
          {activeTab === 'setup' && cloneInfo.clone_instructions.setup.split('\\n').join('\n')}
        </pre>
        <button
          onClick={handleCopyClick}
          className="absolute top-2 right-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {activeTab === 'https' && (
        <div className="mt-4 text-sm text-gray-500">
          <p>Use HTTPS to clone without setting up SSH keys. You'll need to enter your username and password each time you push.</p>
        </div>
      )}
      {activeTab === 'ssh' && (
        <div className="mt-4 text-sm text-gray-500">
          <p>SSH is recommended for developers who regularly push to the repository. It requires setting up SSH keys but doesn't require entering credentials each time.</p>
        </div>
      )}
    </div>
  );
};

export default RepositoryCloneInfo;
