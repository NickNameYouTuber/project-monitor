import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import RepositoryFileExplorer from '../components/repositories/RepositoryFileExplorer';
import CommitHistory from '../components/repositories/CommitHistory';
import RepositoryCloneInfo from '../components/repositories/RepositoryCloneInfo';
import RepositorySettings from '../components/repositories/RepositorySettings';

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

const RepositoryDetail: React.FC = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'commits' | 'members' | 'clone' | 'settings'>('code');

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

  const handleTabChange = (tab: 'code' | 'commits' | 'members' | 'clone' | 'settings') => {
    setActiveTab(tab);
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
        <div>
          <Link
            to="/repositories"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center mb-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Repositories
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{repository.name}</h1>
          <p className="text-[var(--text-secondary)]">
            {repository.description || 'No description provided'} • Owned by <span className="font-medium">{repository.owner.username}</span>
          </p>
        </div>
      </div>

      <div className="border-b border-[var(--border-primary)] mb-8">
        <nav className="flex" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('code')}
            className={`px-4 py-3 text-sm font-medium bg-[var(--bg-secondary)] border-b-2 mr-2 ${activeTab === 'code' ? 'text-[var(--color-primary)] border-[var(--color-primary)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Code
          </button>
          <button
            onClick={() => handleTabChange('commits')}
            className={`px-4 py-3 text-sm font-medium bg-[var(--bg-secondary)] border-b-2 mr-2 ${activeTab === 'commits' ? 'text-[var(--color-primary)] border-[var(--color-primary)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Commits
          </button>
          <button
            onClick={() => handleTabChange('members')}
            className={`px-4 py-3 text-sm font-medium bg-[var(--bg-secondary)] border-b-2 mr-2 ${activeTab === 'members' ? 'text-[var(--color-primary)] border-[var(--color-primary)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Members
          </button>
          <button
            onClick={() => handleTabChange('clone')}
            className={`px-4 py-3 text-sm font-medium bg-[var(--bg-secondary)] border-b-2 mr-2 ${activeTab === 'clone' ? 'text-[var(--color-primary)] border-[var(--color-primary)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Clone
          </button>
          <button
            onClick={() => handleTabChange('settings')}
            className={`px-4 py-3 text-sm font-medium bg-[var(--bg-secondary)] border-b-2 mr-2 ${activeTab === 'settings' ? 'text-[var(--color-primary)] border-[var(--color-primary)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-primary)]'} transition-colors rounded-t`}
          >
            Settings
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="bg-[var(--bg-card)] rounded-lg p-4 border-l-4 border-[var(--color-primary-light)]">
              <RepositoryFileExplorer />
            </div>
          </div>
        )}
        {activeTab === 'commits' && (
          <div className="bg-[var(--bg-card)] rounded-lg p-4 border-l-4 border-[var(--color-primary-light)]">
            <CommitHistory repositoryId={repository.id} path="" />
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
        {activeTab === 'settings' && (
          <div className="bg-[var(--bg-card)] rounded-lg p-6 border-l-4 border-[var(--color-primary-light)]">
            <RepositorySettings repository={repository} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryDetail;
