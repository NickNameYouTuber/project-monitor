import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { Repository } from '../../utils/api/repositories';
import PageHeader from '../../components/common/PageHeader';

const RepositoryList: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAppContext();

  // Загрузка списка репозиториев
  const fetchRepositories = useCallback(async () => {
    if (!currentUser?.token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const repos = await api.repositories.getAll(currentUser.token);
      setRepositories(repos);
    } catch (err: any) {
      console.error('Error fetching repositories:', err);
      setError(err.message || 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg shadow-md p-6">
      <PageHeader
        title="Git Repositories"
        actionButton={{
          text: 'Create Repository',
          link: '/repositories/create',
        }}
      />
      
      {isLoading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">Loading repositories...</div>
      ) : error ? (
        <div className="text-center py-12 text-[var(--state-error)] bg-[var(--state-error-light)] p-4 rounded-md">
          {error}
        </div>
      ) : repositories.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)]">
          <p className="text-[var(--text-muted)] mb-3">You don&apos;t have any repositories yet.</p>
          <Link 
            to="/repositories/create" 
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            Create your first repository
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {repositories.map((repo) => (
            <Link 
              key={repo.id}
              to={`/repositories/${repo.id}`} 
              className="border border-[var(--border-primary)] rounded-lg p-4 bg-[var(--bg-secondary)] hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-[var(--text-primary)] hover:underline cursor-pointer">
                    {repo.name}
                  </h3>
                  {repo.description && (
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 mt-1">{repo.description}</p>
                  )}
                </div>
                <div className="flex items-center text-xs text-[var(--text-muted)] whitespace-nowrap">
                  Updated {new Date(repo.updated_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs pt-2 border-t border-[var(--border-primary)] mt-2">
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center text-[var(--text-muted)]">
                    {repo.visibility === 'public' ? (
                      <span className="inline-block rounded-full px-2 py-1 mr-2 text-xs bg-green-100 text-green-800">
                        Public
                      </span>
                    ) : repo.visibility === 'internal' ? (
                      <span className="inline-block rounded-full px-2 py-1 mr-2 text-xs bg-yellow-100 text-yellow-800">
                        Internal
                      </span>
                    ) : (
                      <span className="inline-block rounded-full px-2 py-1 mr-2 text-xs bg-red-100 text-red-800">
                        Private
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="flex space-x-3 text-[var(--text-muted)]">
                  <button
                    onClick={() => {}}
                    className="hover:text-[var(--color-primary)] transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepositoryList;
