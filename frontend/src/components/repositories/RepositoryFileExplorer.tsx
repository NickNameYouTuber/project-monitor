import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

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
  onFileSelect: (file: GitFile) => void;
}

const RepositoryFileExplorer: React.FC<RepositoryFileExplorerProps> = ({ onFileSelect }) => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const [files, setFiles] = useState<GitFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [repositoryId, currentPath]);

  const fetchFiles = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/repositories/${repositoryId}/files`, {
        params: { path }
      });
      
      setFiles(response.data);
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
      onFileSelect(file);
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
              className="hover:text-blue-600 transition-colors"
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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

  return (
    <div className="bg-[var(--bg-primary)] shadow rounded-lg p-4 h-full overflow-auto">
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
              className="w-full flex items-center py-2 px-2 hover:bg-[var(--bg-secondary)] text-left"
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
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-sm text-gray-500 truncate">
                  {file.last_commit.message} — {formatDate(file.last_commit.date)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default RepositoryFileExplorer;
