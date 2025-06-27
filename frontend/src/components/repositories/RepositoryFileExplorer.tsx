import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import ReactMarkdown from 'react-markdown';

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

interface RepositoryFileExplorerProps {
  // Пустые props так как мы больше не используем onFileSelect
}

const RepositoryFileExplorer: React.FC<RepositoryFileExplorerProps> = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const [files, setFiles] = useState<GitFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [hasReadme, setHasReadme] = useState<boolean>(false);
  const [readmePath, setReadmePath] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches();
    fetchFiles(currentPath);
  }, [repositoryId]);
  
  useEffect(() => {
    if (currentBranch) {
      fetchFiles(currentPath);
    }
  }, [currentBranch, currentPath]);
  
  const fetchBranches = async () => {
    try {
      const response = await api.get(`/repositories/${repositoryId}/branches`);
      setBranches(response.data);
      // Устанавливаем текущую ветку на первую полученную или на 'main'
      if (response.data && response.data.length > 0) {
        const defaultBranch = response.data.includes('main') ? 'main' : response.data[0];
        setCurrentBranch(defaultBranch);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchFiles = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/repositories/${repositoryId}/files`, {
        params: { path }
      });
      
      // Сортировка: сначала папки, потом файлы, оба типа по алфавиту
      const sortedFiles = [...response.data].sort((a, b) => {
        // Если оба элемента одного типа, сортируем по имени
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        // Если разные типы, папки идут первыми
        return a.type === 'directory' ? -1 : 1;
      });
      
      setFiles(sortedFiles);
      
      // Проверяем наличие README.md
      const readmeFile = sortedFiles.find(file => 
        file.type === 'file' && file.name.toLowerCase() === 'readme.md'
      );
      
      if (readmeFile) {
        setHasReadme(true);
        setReadmePath(readmeFile.path);
      } else {
        setHasReadme(false);
        setReadmePath(null);
      }
    } catch (err) {
      console.error('Error fetching repository files:', err);
      setError('Failed to load repository files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: GitFile) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
    } else {
      // Переход на отдельную страницу для просмотра файла
      window.location.href = `/repositories/${repositoryId}/file?path=${encodeURIComponent(file.path)}&branch=${encodeURIComponent(currentBranch)}`;
    }
  };

  const navigateToBreadcrumb = (path: string) => {
    setCurrentPath(path);
  };

  const renderBreadcrumbs = () => {
    const paths = currentPath.split('/').filter(p => p);
    const breadcrumbs = [
      { name: 'Root', path: '' },
      ...paths.map((part, index) => ({
        name: part,
        path: paths.slice(0, index + 1).join('/')
      }))
    ];

    return (
      <div className="flex items-center flex-wrap text-sm text-gray-500">
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <button
              className="hover:text-[var(--color-primary)] transition-colors"
              onClick={() => navigateToBreadcrumb(breadcrumb.path)}
            >
              {breadcrumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex justify-center my-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--state-error-light)] border border-[var(--state-error)] text-[var(--state-error)] px-4 py-3 rounded" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentBranch(e.target.value);
    setCurrentPath('');
  };

  const [readmeContent, setReadmeContent] = useState<string>('');
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);

  useEffect(() => {
    if (readmePath) {
      fetchReadmeContent();
    }
  }, [readmePath]);

  const fetchReadmeContent = async () => {
    if (!readmePath) return;
    
    try {
      setLoadingReadme(true);
      const response = await api.get(`/repositories/${repositoryId}/file-content`, {
        params: { path: readmePath, branch: currentBranch }
      });
      setReadmeContent(response.data.content);
    } catch (err) {
      console.error('Error fetching README content:', err);
    } finally {
      setLoadingReadme(false);
    }
  };

  return (
    <div className="bg-[var(--bg-primary)] shadow rounded-lg p-4 h-full overflow-auto">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor="branch-select" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Branch:</label>
          <div className="relative">
            <select
              id="branch-select"
              value={currentBranch}
              onChange={handleBranchChange}
              className="w-full sm:w-56 py-2 pl-3 pr-10 border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
            >
              {branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {currentPath && (
        <div className="mb-4">
          {renderBreadcrumbs()}
        </div>
      )}
      
      <div className="divide-y divide-[var(--border-primary)]">
        {files.length === 0 ? (
          <p className="p-2 text-[var(--text-muted)] text-sm">This directory is empty</p>
        ) : (
          files.map((file, index) => (
            <button 
              key={index} 
              onClick={() => handleFileClick(file)}
              className="w-full flex items-center py-2 px-3 bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-left rounded my-1 border-l-2 border-transparent hover:border-l-[var(--color-primary)] transition-colors"
            >
              <div className="mr-2 w-6 h-6 flex-shrink-0">
                {file.type === 'directory' ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6" />
                  </svg>
                  : 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586A2 2 0 0114.172 4l2.828 2.828A2 2 0 0118 8.414V19a2 2 0 01-2 2z" />
                  </svg>
                }
              </div>
              <div className="flex-grow min-w-0">
                <div className="truncate font-medium text-[var(--text-primary)]">{file.name}</div>
                <div className="text-sm text-[var(--text-muted)] truncate">
                  {file.last_commit.message} — {formatDate(file.last_commit.date)}
                </div>
              </div>
              {file.name.toLowerCase() === 'readme.md' && (
                <div className="ml-2 px-2 py-1 text-xs rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  README
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Отображение README.md как в GitHub */}
      {hasReadme && currentPath === '' && (
        <div className="mt-8 pt-4 border-t border-[var(--border-primary)]">
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)] flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586A2 2 0 0114.172 4l2.828 2.828A2 2 0 0118 8.414V19a2 2 0 01-2 2z" />
            </svg>
            README.md
          </h2>
          
          {loadingReadme ? (
            <div className="animate-pulse h-40 bg-[var(--bg-secondary)] rounded-md"></div>
          ) : (
            <div className="prose prose-sm max-w-none p-4 bg-[var(--bg-card)] rounded-md border border-[var(--border-primary)] text-[var(--text-primary)]">
              <ReactMarkdown>
                {readmeContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RepositoryFileExplorer;
