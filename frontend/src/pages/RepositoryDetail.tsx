import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import RepositoryFileExplorer from '../components/repositories/RepositoryFileExplorer';
import FileViewer from '../components/repositories/FileViewer';
import CommitHistory from '../components/repositories/CommitHistory';
import RepositoryCloneInfo from '../components/repositories/RepositoryCloneInfo';

interface Repository {
  id: string;
  name: string;
  description: string | null;
  url: string;
  visibility: 'public' | 'private';
  owner: {
    id: string;
    username: string;
    first_name: string;
    last_name: string | null;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
}

interface GitFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number | null;
  last_commit: {
    hash: string;
    message: string;
    date: string;
    author: string;
  };
}

const RepositoryDetail: React.FC = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'commits' | 'members' | 'clone'>('code');
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);

  useEffect(() => {
    const fetchRepository = async () => {
      if (!repositoryId) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/repositories/${repositoryId}`);
        setRepository(response.data);
      } catch (err) {
        console.error('Error fetching repository:', err);
        setError('Failed to load repository details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRepository();
  }, [repositoryId]);

  const handleTabChange = (tab: 'code' | 'commits' | 'members' | 'clone') => {
    setActiveTab(tab);
  };

  const handleFileSelect = (file: GitFile) => {
    setSelectedFile(file);
  };

  const handleBackClick = () => {
    navigate('/repositories');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="bg-[var(--state-error-light)] border border-[var(--state-error)] text-[var(--state-error)] px-4 py-3 rounded m-4" role="alert">
        <span className="block sm:inline">{error || 'Repository not found.'}</span>
        <div className="mt-2">
          <button 
            onClick={handleBackClick}
            className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Back to Repositories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{repository.name}</h1>
          <div className="text-sm text-[var(--text-secondary)]">
            Owned by <span className="font-medium">{repository.owner.username}</span>
          </div>
        </div>
        {repository.description && (
          <p className="text-[var(--text-primary)] mt-1">{repository.description}</p>
        )}
        <button
          onClick={handleBackClick}
          className="mt-3 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Repositories
        </button>
      </div>

      <div className="border-b border-[var(--border-primary)] mb-8">
        <nav className="flex" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('code')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'code' ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Code
          </button>
          <button
            onClick={() => handleTabChange('commits')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'commits' ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Commits
          </button>
          <button
            onClick={() => handleTabChange('members')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'members' ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Members
          </button>
          <button
            onClick={() => handleTabChange('clone')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'clone' ? 'bg-[var(--bg-secondary)] text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Clone
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="bg-[var(--bg-card)] rounded-lg p-4 border-l-4 border-[var(--color-primary-light)]">
              <RepositoryFileExplorer 
                onFileSelect={handleFileSelect}
              />
              <FileViewer 
                repositoryId={repository.id} 
                file={selectedFile} 
              />
            </div>
          </div>
        )}
        {activeTab === 'commits' && (
          <div className="bg-[var(--bg-card)] rounded-lg p-4 border-l-4 border-[var(--color-primary-light)]">
            <CommitHistory repositoryId={repository.id} path={selectedFile?.path || ''} />
          </div>
        )}
        {activeTab === 'members' && (
          <div className="bg-[var(--bg-card)] shadow rounded-lg p-6 h-[400px] flex items-center justify-center text-[var(--text-secondary)] border-l-4 border-[var(--color-primary-light)]">
            <p>Members list will be implemented soon.</p>
          </div>
        )}
        {activeTab === 'clone' && (
          <div className="bg-[var(--bg-card)] rounded-lg p-4 border-l-4 border-[var(--color-primary-light)]">
            <RepositoryCloneInfo repositoryId={repository.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryDetail;
