import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { Repository } from '../../utils/api/repositories';
import PageHeader from '../common/PageHeader';

const RepositoryList: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, api } = useAppContext();

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
  }, [api.repositories, currentUser?.token]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Git Repositories"
        actionButton={{
          text: 'Create Repository',
          link: '/repositories/create',
        }}
      />
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
          <button 
            className="mt-2 text-sm underline" 
            onClick={() => fetchRepositories()}
          >
            Try again
          </button>
        </div>
      ) : repositories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-secondary mb-4">
            You don't have any repositories yet.
          </p>
          <Link 
            to="/repositories/create" 
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded"
          >
            Create your first repository
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <Link 
              key={repo.id}
              to={`/repositories/${repo.id}`} 
              className="bg-bg-secondary rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow p-6"
            >
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {repo.name}
              </h3>
              <p className="text-text-secondary mb-4 line-clamp-2">
                {repo.description || 'No description provided'}
              </p>
              <div className="flex items-center text-sm text-text-tertiary">
                <span className={`
                  inline-block rounded-full px-2 py-1 mr-2 text-xs
                  ${repo.visibility === 'public' ? 'bg-green-100 text-green-800' : 
                    repo.visibility === 'internal' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'}
                `}>
                  {repo.visibility.charAt(0).toUpperCase() + repo.visibility.slice(1)}
                </span>
                <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepositoryList;
