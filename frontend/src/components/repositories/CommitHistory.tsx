import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

interface GitFileChange {
  file_path: string;
  change_type: string;
  diff: string;
}

interface GitCommitDetail {
  hash: string;
  message: string;
  author: string;
  date: string;
  changes: GitFileChange[];
}

interface CommitHistoryProps {
  repositoryId: string;
  path?: string;
}

const CommitHistory: React.FC<CommitHistoryProps> = ({ repositoryId, path }) => {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedCommitDetail, setSelectedCommitDetail] = useState<GitCommitDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    const fetchCommits = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/repositories/${repositoryId}/commits`, {
          params: {
            path: path || '',
            page,
            limit: 20,
          },
        });
        setCommits(response.data);
      } catch (err) {
        setError('Failed to load commit history. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommits();
  }, [repositoryId, path, page]);

  const fetchCommitDetail = async (commitHash: string) => {
    try {
      setDetailLoading(true);
      setDialogOpen(true);
      const response = await api.get(`/repositories/${repositoryId}/commits/${commitHash}`);
      setSelectedCommitDetail(response.data);
    } catch (err) {
      console.error('Error fetching commit details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCommitClick = (commit: GitCommit) => {
    fetchCommitDetail(commit.hash);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCommitDetail(null);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'PPP HH:mm', { locale: ru });
    } catch (e) {
      return dateString;
    }
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
    <div className="bg-[var(--bg-primary)] shadow rounded-lg p-4 h-full overflow-auto flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Commit History</h2>
      {commits.length === 0 ? (
        <p className="p-2 text-[var(--text-muted)] text-sm">No commits found</p>
      ) : (
        <div className="flex-grow overflow-auto divide-y divide-[var(--border-primary)] border-b border-[var(--border-primary)] mb-4">
          {commits.map((commit) => (
            <button
              key={commit.hash}
              onClick={() => handleCommitClick(commit)}
              className="w-full text-left py-3 px-3 bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] transition-colors border-l-2 border-transparent hover:border-l-[var(--color-primary)] rounded my-1"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                <div className="font-medium truncate text-[var(--text-primary)]">{commit.message}</div>
                <div className="text-xs text-[var(--text-muted)]">{formatDate(commit.date)}</div>
              </div>
              <div className="flex items-center text-sm text-[var(--text-secondary)] truncate">
                <div className="mr-2 w-5 h-5 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-white text-xs font-medium">
                  {commit.author.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{commit.author}</span>
                <div className="mx-2 text-[var(--border-primary)]">|</div>
                <span className="text-[var(--text-muted)] truncate">{commit.hash.substring(0, 7)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      <div className="mt-auto flex justify-center space-x-2 pt-3">
        <button
          onClick={() => setPage(prev => Math.max(0, prev - 1))}
          disabled={page === 0}
          className="px-3 py-1 border border-[var(--border-primary)] rounded enabled:hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setPage(prev => prev + 1)}
          disabled={commits.length < 20}
          className="px-3 py-1 border border-[var(--border-primary)] rounded enabled:hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {dialogOpen && selectedCommitDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseDialog}>
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading && (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
              </div>
            )}
            <div className="p-4 border-b border-[var(--border-primary)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selectedCommitDetail.message}</h3>
              <div className="flex items-center mt-1 text-sm text-[var(--text-secondary)]">
                <div className="mr-2 w-6 h-6 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-white text-sm font-medium">
                  {selectedCommitDetail.author.charAt(0).toUpperCase()}
                </div>
                <span>{selectedCommitDetail.author}</span>
                <div className="mx-2 text-[var(--border-primary)]">|</div>
                <span>{formatDate(selectedCommitDetail.date)}</span>
                <div className="mx-2 text-[var(--border-primary)]">|</div>
                <span className="font-mono">{selectedCommitDetail.hash.substring(0, 7)}</span>
              </div>
            </div>
            <div className="p-4 max-h-[60vh] overflow-auto">
              {selectedCommitDetail.changes.map((change, index) => (
                <div key={index} className="mb-6 border-l-4 border-[var(--border-primary)] pl-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center text-sm truncate">
                      <span className="truncate font-medium text-[var(--text-primary)]">{change.file_path}</span>
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${change.change_type === 'added' ? 'bg-[var(--state-success-light)] text-[var(--state-success)]' : change.change_type === 'deleted' ? 'bg-[var(--state-error-light)] text-[var(--state-error)]' : 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'}`}>{change.change_type}</span>
                    </div>
                  </div>
                  {change.diff && (
                    <div className="bg-gray-900 rounded overflow-hidden text-xs font-mono text-white mt-2 max-h-64 overflow-auto">
                      <pre className="p-2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                        {change.diff.split('\n').map((line, lineIndex) => {
                          let colorClass = '';
                          if (line.startsWith('+')) {
                            colorClass = 'text-green-400';
                          } else if (line.startsWith('-')) {
                            colorClass = 'text-red-400';
                          } else if (line.startsWith('@@')) {
                            colorClass = 'text-blue-400';
                          }
                          return <div key={lineIndex} className={colorClass}>{line}</div>;
                        })}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button onClick={handleCloseDialog} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommitHistory;
