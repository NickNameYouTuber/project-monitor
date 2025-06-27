import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { RepositoryDetail as RepositoryDetailType } from '../../utils/api/repositories';
import type { RepositoryMemberDetail } from '../../utils/api/repositoryMembers';
import PageHeader from '../../components/common/PageHeader';

const RepositoryDetail: React.FC = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  
  const [repository, setRepository] = useState<RepositoryDetailType | null>(null);
  const [members, setMembers] = useState<RepositoryMemberDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'members'>('overview');

  // Загрузка данных репозитория
  const fetchRepositoryData = useCallback(async () => {
    if (!currentUser?.token || !repositoryId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Загружаем информацию о репозитории
      const repoData = await api.repositories.getOne(repositoryId, currentUser.token);
      setRepository(repoData);
      
      // Загружаем информацию об участниках репозитория
      const membersData = await api.repositories.members.getByRepository(repositoryId, currentUser.token);
      setMembers(membersData);
    } catch (err: any) {
      console.error('Error loading repository data:', err);
      setError(err.message || 'Failed to load repository data');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.token, repositoryId]);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchRepositoryData();
  }, [fetchRepositoryData]);

  // Обработчик удаления репозитория
  const handleDeleteRepository = useCallback(async () => {
    if (!currentUser?.token || !repositoryId || !repository) return;
    
    if (!confirm(`Are you sure you want to delete the repository "${repository.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.repositories.delete(repositoryId, currentUser.token);
      navigate('/repositories');
    } catch (err: any) {
      console.error('Error deleting repository:', err);
      alert(`Failed to delete repository: ${err.message || 'Unknown error'}`);
    }
  }, [currentUser?.token, navigate, repository, repositoryId]);

  // Проверка, является ли текущий пользователь владельцем репозитория
  const isOwner = repository && currentUser && repository.owner_id === currentUser.id;

  // Функция для отображения статуса роли участника репозитория
  const getMemberRoleBadge = (role: string) => {
    switch(role) {
      case 'admin':
        return <span className="bg-[var(--state-info-light)] text-[var(--state-info)] px-2 py-1 rounded-full text-xs">Admin</span>;
      case 'contributor':
        return <span className="bg-[var(--color-accent)] bg-opacity-20 text-[var(--color-accent)] px-2 py-1 rounded-full text-xs">Contributor</span>;
      case 'viewer':
      default:
        return <span className="bg-[var(--bg-card)] text-[var(--text-secondary)] px-2 py-1 rounded-full text-xs">Viewer</span>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="bg-[var(--state-error-light)] border-l-4 border-[var(--state-error)] text-[var(--state-error)] p-4 mb-4" role="alert">
          <p>{error}</p>
          <button 
            className="mt-2 text-sm underline text-[var(--color-primary)]" 
            onClick={() => fetchRepositoryData()}
          >
            Try again
          </button>
        </div>
      ) : repository ? (
        <>
          <PageHeader
            title={repository.name}
            subtitle={
              <div className="flex items-center text-sm text-text-tertiary">
                <span className={`
                  inline-block rounded-full px-2 py-1 mr-2 text-xs
                  ${repository.visibility === 'public' ? 'bg-[var(--state-success-light)] text-[var(--state-success)]' : 
                    repository.visibility === 'internal' ? 'bg-[var(--state-warning-light)] text-[var(--state-warning)]' : 
                    'bg-[var(--state-error-light)] text-[var(--state-error)]'}
                `}>
                  {repository.visibility.charAt(0).toUpperCase() + repository.visibility.slice(1)}
                </span>
                <span>Created by {repository.owner.username} • Updated {new Date(repository.updated_at).toLocaleDateString()}</span>
              </div>
            }
            backButton={{ text: 'All Repositories', link: '/repositories' }}
          />
          
          {repository.description && (
            <div className="bg-[var(--bg-secondary)] p-4 rounded-lg mb-6">
              <p className="text-[var(--text-primary)]">{repository.description}</p>
            </div>
          )}
          
          <div className="mb-6 border-b border-[var(--border-primary)]">
            <nav className="flex space-x-6">
              <button
                className={`py-2 px-1 ${activeTab === 'overview' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`py-2 px-1 ${activeTab === 'files' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'}`}
                onClick={() => setActiveTab('files')}
              >
                Files
              </button>
              <button
                className={`py-2 px-1 ${activeTab === 'members' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'}`}
                onClick={() => setActiveTab('members')}
              >
                Members
              </button>
            </nav>
          </div>
          
          {/* Содержимое активной вкладки */}
          <div className="mb-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold mb-2">About this repository</h3>
                <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                  {repository.project_id && (
                    <div className="mb-2">
                      <span className="text-[var(--text-secondary)]">Linked Project: </span>
                      <Link 
                        to={`/projects/${repository.project_id}/tasks`}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        View Project
                      </Link>
                    </div>
                  )}
                  
                  <div className="mb-2">
                    <span className="text-[var(--text-secondary)]">Clone URL: </span>
                    <code className="bg-[var(--bg-card)] text-[var(--text-primary)] p-1 rounded">
                      {repository.url || 'Not available yet'}
                    </code>
                  </div>
                  
                  <div className="mt-4">
                    {isOwner && (
                      <div className="flex space-x-4">
                        <Link 
                          to={`/repositories/${repository.id}/edit`}
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          Edit Repository
                        </Link>
                        <button 
                          onClick={handleDeleteRepository}
                          className="text-[var(--state-error)] hover:underline"
                        >
                          Delete Repository
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'files' && (
              <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Repository Files</h3>
                <p className="text-[var(--text-secondary)]">
                  File browsing functionality will be available soon.
                </p>
                <div className="mt-4 p-4 border border-dashed border-[var(--border-primary)] rounded-lg">
                  <h4 className="font-medium mb-2 text-[var(--text-primary)]">Quick Start</h4>
                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    To push an existing repository:
                  </p>
                  <pre className="bg-[var(--bg-card)] p-3 rounded text-xs overflow-auto text-[var(--text-primary)]">
{`git remote add origin ${repository.url || '[REPOSITORY_URL]'}
git branch -M main
git push -u origin main`}
                  </pre>
                </div>
              </div>
            )}
            
            {activeTab === 'members' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Repository Members</h3>
                  {isOwner && (
                    <button 
                      className="px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded text-sm"
                      onClick={() => alert('Add member functionality will be available soon.')}
                    >
                      Add Member
                    </button>
                  )}
                </div>
                
                <div className="bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
                  {members.length > 0 ? (
                    <div className="min-w-full divide-y divide-[var(--border-primary)]">
                      <div className="bg-[var(--bg-card)]">
                        <div className="grid grid-cols-12 gap-2 px-6 py-3 text-left">
                          <div className="col-span-5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">User</div>
                          <div className="col-span-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Role</div>
                          <div className="col-span-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Added</div>
                          <div className="col-span-1"></div>
                        </div>
                      </div>
                      <div className="divide-y divide-[var(--border-primary)]">
                        {members.map(member => (
                          <div key={member.id} className="grid grid-cols-12 gap-2 px-6 py-4 hover:bg-[var(--bg-card)]">
                            <div className="col-span-5 flex items-center">
                              <span className="text-[var(--text-primary)]">{member.user.username}</span>
                              {repository.owner_id === member.user_id && (
                                <span className="ml-2 bg-[var(--state-info-light)] text-[var(--state-info)] px-2 py-0.5 rounded-full text-xs">Owner</span>
                              )}
                            </div>
                            <div className="col-span-3">
                              {getMemberRoleBadge(member.role)}
                            </div>
                            <div className="col-span-3 text-[var(--text-muted)] text-sm">
                              {new Date(member.created_at).toLocaleDateString()}
                            </div>
                            <div className="col-span-1 flex justify-end">
                              {isOwner && repository.owner_id !== member.user_id && (
                                <button 
                                  className="text-[var(--state-error)] hover:text-[var(--state-error)]"
                                  onClick={() => alert('Remove member functionality will be available soon.')}
                                >
                                  <span className="sr-only">Remove</span>
                                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-[var(--text-secondary)]">No members found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">Repository not found</p>
          <Link 
            to="/repositories" 
            className="text-[var(--color-primary)] hover:underline"
          >
            Back to Repositories
          </Link>
        </div>
      )}
    </div>
  );
};

export default RepositoryDetail;
