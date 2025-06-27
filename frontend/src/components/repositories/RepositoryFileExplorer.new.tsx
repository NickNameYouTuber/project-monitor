import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-markdown-preview/markdown.css';
import '../../styles/markdown-theme.css';

// Интерфейсы
interface GitFile {
  name: string;
  path: string;
  type: string;
  size?: number;
  last_commit?: {
    hash: string;
    message: string;
    date: string;
    author: string;
  };
}

interface GitBranch {
  name: string;
  commit_hash: string;
  is_default: boolean;
  last_commit_date?: string;
  last_commit_message?: string;
}

interface Props {
  repositoryId?: string;
  onFileSelect?: (file: GitFile, branch: string) => void;
}

const RepositoryFileExplorer: React.FC<Props> = ({ repositoryId: propsRepoId, onFileSelect }) => {
  const params = useParams<{ repositoryId: string }>();
  const repositoryId = propsRepoId || params.repositoryId;
  const navigate = useNavigate();
  
  // Состояния
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<GitFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [readmePath, setReadmePath] = useState<string | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Загрузка веток при монтировании компонента
  useEffect(() => {
    if (repositoryId) {
      loadBranches();
    }
  }, [repositoryId]);

  // Загрузка файлов при изменении пути или ветки
  useEffect(() => {
    if (repositoryId && currentBranch) {
      loadFiles(currentPath);
    }
  }, [repositoryId, currentPath, currentBranch]);

  // Функция загрузки веток
  const loadBranches = async () => {
    if (!repositoryId) return;
    
    setLoadingBranches(true);
    setError(null);
    
    try {
      const response = await api.get(`/repositories/${repositoryId}/branches`);
      setBranches(response.data);
      
      // Устанавливаем ветку по умолчанию
      const defaultBranch = response.data.find((branch: GitBranch) => branch.is_default);
      if (defaultBranch) {
        setCurrentBranch(defaultBranch.name);
      } else if (response.data.length > 0) {
        setCurrentBranch(response.data[0].name);
      }
    } catch (error) {
      console.error("Error loading branches:", error);
      setError("Не удалось загрузить ветки репозитория");
    } finally {
      setLoadingBranches(false);
    }
  };

  // Функция загрузки файлов по пути и ветке
  const loadFiles = async (path: string) => {
    if (!repositoryId || !currentBranch) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/repositories/${repositoryId}/files`, {
        params: { path, branch: currentBranch }
      });
      
      // Сортировка: сначала директории, затем файлы
      const sortedFiles = response.data.sort((a: GitFile, b: GitFile) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      setFiles(sortedFiles);
      
      // Ищем README.md в текущей директории
      await loadReadme(path, sortedFiles);
    } catch (error) {
      console.error("Error loading files:", error);
      setError("Не удалось загрузить файлы");
    } finally {
      setLoading(false);
    }
  };

  // Функция для загрузки README.md
  const loadReadme = async (path: string, files: GitFile[]) => {
    if (!repositoryId || !currentBranch) return;
    
    const readmeFile = files.find(file => 
      file.type === 'file' && file.name.toLowerCase() === 'readme.md'
    );
    
    if (readmeFile) {
      try {
        const readmeResponse = await api.get(
          `/repositories/${repositoryId}/content/${readmeFile.path}`,
          { params: { branch: currentBranch } }
        );
        setReadme(readmeResponse.data.content);
        setReadmePath(readmeFile.path);
      } catch (error) {
        console.error("Error loading README:", error);
        setReadme(null);
        setReadmePath(null);
      }
    } else {
      setReadme(null);
      setReadmePath(null);
    }
  };

  // Функция для обработки клика по файлу
  const handleFileClick = (file: GitFile) => {
    if (file.type === 'directory') {
      // Для директорий обновляем путь
      setCurrentPath(file.path);
    } else {
      // Для файлов вызываем колбэк или переходим на страницу просмотра
      if (onFileSelect) {
        onFileSelect(file, currentBranch);
      } else {
        navigate(`/repositories/${repositoryId}/file/${encodeURIComponent(file.path)}?branch=${currentBranch}`);
      }
    }
  };

  // Обработчик изменения ветки
  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentBranch(e.target.value);
    setCurrentPath(''); // Сбрасываем путь при смене ветки
  };

  // Функция для перехода по хлебным крошкам
  const navigateToBreadcrumb = (path: string) => {
    setCurrentPath(path);
  };

  // Форматирование даты
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Генерируем хлебные крошки
  const breadcrumbs = [
    { name: "Root", path: "" },
    ...currentPath
      .split('/')
      .filter(Boolean)
      .map((part, index, parts) => ({
        name: part,
        path: parts.slice(0, index + 1).join('/')
      }))
  ];
  
  // Отображаем индикатор загрузки
  if (loadingBranches) {
    return (
      <div className="flex justify-center my-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }
  
  // Отображаем ошибку
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-lg shadow-sm overflow-hidden">
      {/* Навигация: хлебные крошки и выбор ветки */}
      <div className="flex flex-wrap justify-between items-center p-4 border-b border-[var(--border-color)] gap-2">
        {/* Селектор ветки */}
        <div className="flex items-center text-sm">
          <label htmlFor="branch-select" className="mr-2 text-[var(--text-secondary)]">
            Branch:
          </label>
          <select
            id="branch-select"
            value={currentBranch}
            onChange={handleBranchChange}
            className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
            disabled={loadingBranches}
          >
            {branches.length === 0 ? (
              <option>No branches</option>
            ) : (
              branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.is_default ? '(default)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Хлебные крошки */}
        <div className="flex flex-wrap items-center">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <span className="mx-2 text-[var(--text-secondary)]">/</span>}
              <button
                onClick={() => navigateToBreadcrumb(crumb.path)}
                className={`hover:text-[var(--color-primary)] text-[var(--text-primary)] ${index === breadcrumbs.length - 1 ? 'font-semibold' : ''}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      )}

      {/* Список файлов */}
      {!loading && (
        <div className="p-4">
          {files.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-4">
              Эта директория пуста
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {files.map((file, index) => (
                <div
                  key={file.path}
                  className="py-2 px-3 hover:bg-[var(--bg-tertiary)] cursor-pointer rounded transition-colors flex items-center"
                  onClick={() => handleFileClick(file)}
                >
                  <div className="mr-3 text-[var(--text-secondary)]">
                    {file.type === 'directory' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{file.name}</div>
                    {file.last_commit && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        {file.last_commit.message && `${file.last_commit.message.substring(0, 50)}${file.last_commit.message.length > 50 ? '...' : ''}`} 
                        {file.last_commit.date && ` - ${formatDate(file.last_commit.date)}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* README.md display section */}
      {readme && (
        <div className="mt-4 border-t border-[var(--border-color)] p-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            README.md
          </h2>
          <div className="bg-[var(--bg-tertiary)] rounded p-4">
            <MDEditor.Markdown 
              source={readme} 
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryFileExplorer;
