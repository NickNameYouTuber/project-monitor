import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-markdown-preview/markdown.css';
import '../styles/markdown-theme.css';

interface FilePreviewProps {
  // Компонент может принимать пропсы, но мы используем params из роута
}

const RepositoryFilePreview: React.FC<FilePreviewProps> = () => {
  const { repositoryId, filePath } = useParams<{ repositoryId: string; filePath: string }>();
  const [searchParams] = useSearchParams();
  const branch = searchParams.get('branch') || 'main';
  const navigate = useNavigate();

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkdown, setIsMarkdown] = useState<boolean>(false);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (!repositoryId || !filePath) return;
      
      try {
        setLoading(true);
        const decodedPath = decodeURIComponent(filePath);
        
        // Получаем имя файла из пути
        setFileName(decodedPath.split('/').pop() || '');

        // Проверяем, является ли файл markdown-файлом
        const isMarkdownFile = decodedPath.toLowerCase().endsWith('.md') || 
                               decodedPath.toLowerCase().endsWith('.markdown');
        setIsMarkdown(isMarkdownFile);

        const response = await api.get(`/repositories/${repositoryId}/content/${decodedPath}`, {
          params: { branch }
        });
        
        setFileContent(response.data.content);
      } catch (err) {
        console.error('Error fetching file content:', err);
        setError('Failed to load file content.');
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [repositoryId, filePath, branch]);

  const handleBackClick = () => {
    navigate(`/repositories/${repositoryId}`);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to={`/repositories/${repositoryId}`}
              className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center mb-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Назад к репозиторию
            </Link>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{fileName}</h1>
              <span className="ml-3 px-2 py-1 text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-md">
                {branch}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      ) : error ? (
        <div className="bg-[var(--state-error-light)] border border-[var(--state-error)] text-[var(--state-error)] px-4 py-3 rounded m-4" role="alert">
          <span className="block sm:inline">{error}</span>
          <div className="mt-2">
            <button 
              onClick={handleBackClick}
              className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Назад к репозиторию
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] overflow-hidden">
          <div className="border-b border-[var(--border-primary)] px-4 py-2 bg-[var(--bg-secondary)] flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[var(--text-primary)] font-medium">{fileName}</span>
          </div>
          <div className="p-4">
            {isMarkdown ? (
              <div className="markdown-content bg-white dark:bg-gray-800 rounded p-4 shadow">
                <MDEditor.Markdown 
                  source={fileContent || ''} 
                  style={{ 
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            ) : (
              <pre className="bg-white dark:bg-gray-800 rounded p-4 shadow overflow-x-auto">
                <code>{fileContent}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryFilePreview;
