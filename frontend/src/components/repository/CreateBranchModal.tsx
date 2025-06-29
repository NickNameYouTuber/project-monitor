import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../utils/AppContext';
import repositoriesApi from '../../utils/api/repositories';
import type { GitBranch, CreateBranchRequest } from '../../utils/api/repositories';

interface CreateBranchModalProps {
  repositoryId: string;
  taskId?: string;
  onClose: () => void;
  onBranchCreated?: (branchName: string) => void;
}

const CreateBranchModal: React.FC<CreateBranchModalProps> = ({ 
  repositoryId, 
  taskId,
  onClose,
  onBranchCreated
}) => {
  const { currentUser } = useAppContext();
  const [branchName, setBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('');
  const [availableBranches, setAvailableBranches] = useState<GitBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  // Загрузка существующих веток
  useEffect(() => {
    const fetchBranches = async () => {
      if (!currentUser?.token) return;
      
      try {
        setIsLoadingBranches(true);
        const branches = await repositoriesApi.git.getBranches(repositoryId, currentUser.token);
        setAvailableBranches(branches);
        
        // Установить ветку по умолчанию
        const defaultBranch = branches.find(b => b.is_default);
        if (defaultBranch) {
          setBaseBranch(defaultBranch.name);
        } else if (branches.length > 0) {
          setBaseBranch(branches[0].name);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError('Не удалось загрузить список веток');
      } finally {
        setIsLoadingBranches(false);
      }
    };
    
    fetchBranches();
  }, [repositoryId, currentUser?.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.token) return;
    if (!branchName.trim()) {
      setError('Имя ветки не может быть пустым');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const request: CreateBranchRequest = {
        name: branchName,
        base_branch: baseBranch,
      };
      
      // Если есть ID задачи, добавляем его в запрос
      if (taskId) {
        request.task_id = taskId;
      }
      
      await repositoriesApi.git.createBranch(
        repositoryId,
        request,
        currentUser.token
      );
      
      if (onBranchCreated) {
        onBranchCreated(branchName);
      }
      
      onClose();
    } catch (err: any) {
      console.error('Error creating branch:', err);
      setError(err.response?.data?.detail || 'Не удалось создать ветку');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Генерация имени ветки на основе названия задачи (если есть)
  const generateBranchName = () => {
    // Шаблон: feature/task-123-short-description
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setBranchName(`feature/task-${taskId ? taskId.substring(0, 8) : randomSuffix}`);
  };

  return (
    <>
      <div className="fixed inset-0 bg-overlay z-40" onClick={handleBackdropClick} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-bg-card rounded-lg shadow-xl w-full overflow-hidden">
            <div className="px-4 py-3 sm:px-6 border-b border-border-primary flex justify-between items-center">
              <h3 className="text-lg font-medium text-text-primary">Создать ветку</h3>
              <button 
                onClick={onClose}
                className="text-text-muted hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 bg-state-error/10 border border-state-error/30 text-state-error rounded px-4 py-3">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="branchName" className="block text-sm font-medium text-text-secondary mb-1">
                  Имя ветки
                </label>
                <div className="flex">
                  <input
                    id="branchName"
                    type="text"
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    placeholder="feature/task-123"
                    className="flex-1 rounded-l-md bg-bg-secondary border border-border-primary text-text-primary px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={generateBranchName}
                    className="bg-bg-secondary border border-l-0 border-border-primary rounded-r-md px-3 text-text-secondary hover:text-primary"
                    disabled={isLoading}
                  >
                    Сгенерировать
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Используйте формат feature/task-[id] для задач
                </p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="baseBranch" className="block text-sm font-medium text-text-secondary mb-1">
                  Базовая ветка
                </label>
                {isLoadingBranches ? (
                  <div className="flex items-center text-text-muted">
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Загрузка веток...
                  </div>
                ) : (
                  <select
                    id="baseBranch"
                    value={baseBranch}
                    onChange={e => setBaseBranch(e.target.value)}
                    className="w-full rounded-md bg-bg-secondary border border-border-primary text-text-primary px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isLoading || availableBranches.length === 0}
                  >
                    {availableBranches.length === 0 ? (
                      <option value="">Нет доступных веток</option>
                    ) : (
                      availableBranches.map(branch => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name} {branch.is_default ? '(по умолчанию)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-bg-secondary border border-border-primary text-text-secondary rounded-md hover:bg-bg-primary transition-colors"
                  disabled={isLoading}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7AB988] text-white rounded-md hover:bg-[#5DA570] transition-colors flex items-center"
                  disabled={isLoading || isLoadingBranches || availableBranches.length === 0}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Создание...
                    </>
                  ) : (
                    'Создать ветку'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateBranchModal;
