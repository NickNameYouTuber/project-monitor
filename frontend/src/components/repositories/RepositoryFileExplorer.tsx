import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Markdown from 'react-markdown';

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
  // Пропсы не требуются для текущей реализации
}

const RepositoryFileExplorer: React.FC<RepositoryFileExplorerProps> = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<GitFile[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches();
  }, [repositoryId]);
  
  useEffect(() => {
    fetchFiles(currentPath);
  }, [repositoryId, currentPath, currentBranch]);
  
  const fetchBranches = async () => {
    try {
      const response = await api.get(`/repositories/${repositoryId}/branches`);
      setBranches(response.data);
      
      // Set default branch if available
      if (response.data.includes('main')) {
        setCurrentBranch('main');
      } else if (response.data.includes('master')) {
        setCurrentBranch('master');
      } else if (response.data.length > 0) {
        setCurrentBranch(response.data[0]);
      }
    } catch (err) {
      console.error('Error fetching repository branches:', err);
    }
  };

  const fetchFiles = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/repositories/${repositoryId}/files`, {
        params: { path, branch: currentBranch }
      });
      
      // Sort files: directories first, then files, both alphabetically
      const sortedFiles = [...response.data].sort((a, b) => {
        // First sort by type (directory first)
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
      
      setFiles(sortedFiles);
      
      // Check for README.md in the current directory
      const readmeFile = response.data.find((file: GitFile) => 
        file.type === 'file' && 
        (file.name.toLowerCase() === 'readme.md' || file.name.toLowerCase() === 'readme.markdown')
      );
      
      if (readmeFile) {
        fetchReadmeContent(readmeFile.path);
      } else {
        setReadmeContent(null);
      }
    } catch (err) {
      console.error('Error fetching repository files:', err);
      setError('Failed to load repository files. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReadmeContent = async (path: string) => {
    try {
      const response = await api.get(`/repositories/${repositoryId}/file-content`, {
        params: { path, branch: currentBranch }
      });
      
      setReadmeContent(response.data.content);
    } catch (err: any) {
      console.error('Error fetching README content:', err);
      setReadmeContent(null);
    }
  };

  const handleFileClick = (file: GitFile) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
    } else {
      navigate(`/repositories/${repositoryId}/file/${encodeURIComponent(file.path)}?branch=${currentBranch}`);
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
      <div className="flex items-center flex-wrap text-sm text-[var(--text-secondary)]">
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-1 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentBranch(e.target.value);
    setCurrentPath(''); // Reset path when changing branches
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

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg overflow-auto">
      {/* Branch selector */}
      <div className="p-4 mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border-primary)]">
        <div className="flex-1 min-w-0">
          {currentPath && renderBreadcrumbs()}
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className="relative">
            <select 
              value={currentBranch}
              onChange={handleBranchChange}
              className="appearance-none pl-3 pr-10 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded text-[var(--text-primary)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)]">
              {branches.length > 0 ? (
                branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))
              ) : (
                <option value="main">main</option>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-primary)]">
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 divide-y divide-[var(--border-primary)] mb-6">
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
            </button>
          ))
        )}
      </div>
      
      {/* README.md display section */}
      {readmeContent && (
        <div className="mt-4 border-t border-[var(--border-primary)] pt-6 px-4 pb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a2 2 0 011.414.586l4.414 4.414A2 2 0 0118 9.414V19a2 2 0 01-2 2z" />
            </svg>
            README.md
          </h2>
          <div className="prose max-w-none bg-[var(--bg-card)] rounded-lg p-6 border-l-4 border-[var(--color-primary-light)] text-[var(--text-primary)]">
            <Markdown>{readmeContent}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryFileExplorer;