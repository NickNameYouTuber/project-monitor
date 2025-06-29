import React, { useState, useEffect, useMemo } from 'react';
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
  const [inputValue, setInputValue] = useState('');
  const [availableBranches, setAvailableBranches] = useState<GitBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  
  // Генерируем дефолтное имя ветки для автозаполнения
  const defaultBranchName = useMemo(() => {
    return `feature/task-${taskId ? taskId.substring(0, 8) : Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }, [taskId]);

  // Загрузка существующих веток
  useEffect(() => {
    const fetchBranches = async () => {
      if (!currentUser?.token) return;
      
      try {
        setIsLoadingBranches(true);
        const branches = await repositoriesApi.git.getBranches(repositoryId, currentUser.token);
        setAvailableBranches(branches);
        
        // Заполняем поле ветки по умолчанию
        setInputValue(defaultBranchName);
        setBranchName(defaultBranchName);
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError('Не удалось загрузить список веток');
      } finally {
        setIsLoadingBranches(false);
      }
    };
    
    fetchBranches();
  }, [repositoryId, currentUser?.token, defaultBranchName]);

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
      
      // Определяем базовую ветку - используем первую дефолтную или первую доступную
      const defaultBranch = availableBranches.find(b => b.is_default);
      const baseBranchName = defaultBranch ? defaultBranch.name : 
                           (availableBranches.length > 0 ? availableBranches[0].name : 'master');
      
      const request: CreateBranchRequest = {
        name: branchName,
        base_branch: baseBranchName,
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

  // Обработка изменения ввода с подсказками
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setBranchName(value);
  };
  
  // Отфильтрованные ветки для подсказок
  const filteredBranches = useMemo(() => {
    return inputValue
      ? availableBranches
          .filter(branch => branch.name.toLowerCase().includes(inputValue.toLowerCase()))
          .slice(0, 5)
      : [];
  }, [availableBranches, inputValue]);
  
  // Генерация имени ветки
  const generateBranchName = () => {
    setInputValue(defaultBranchName);
    setBranchName(defaultBranchName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-card rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="border-b border-border-primary px-6 py-4">
          <h2 className="text-xl font-semibold text-text-primary">Создать ветку</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-state-error/10 border border-state-error/30 text-state-error rounded px-4 py-3">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <label htmlFor="branchName" className="block text-sm font-medium text-text-secondary mb-1">
              Имя ветки
            </label>
            <div className="flex">
              <div className="relative flex-1">
                <input
                  id="branchName"
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="feature/task-123"
                  className="w-full rounded-l-md bg-bg-secondary border border-border-primary text-text-primary px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isLoading}
                  required
                  autoFocus
                />
                
                {/* Список подсказок для существующих веток */}
                {filteredBranches.length > 0 && inputValue && (
                  <div className="absolute left-0 right-0 mt-1 bg-bg-card border border-border-primary rounded-md shadow-lg z-10">
                    {filteredBranches.map(branch => (
                      <div 
                        key={branch.name}
                        className="px-4 py-2 hover:bg-bg-secondary cursor-pointer text-text-primary"
                        onClick={() => {
                          setInputValue(branch.name);
                          setBranchName(branch.name);
                        }}
                      >
                        {branch.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={generateBranchName}
                className="bg-bg-secondary border border-l-0 border-border-primary rounded-r-md px-3 text-text-secondary hover:text-primary"
                disabled={isLoading}
                title="Сгенерировать имя ветки на основе ID задачи"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Используйте формат feature/task-[id] для задач
            </p>
          </div>
          
          {isLoadingBranches && (
            <div className="flex justify-center items-center text-text-muted mb-6">
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Загрузка веток...
            </div>
          )}
          
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
              disabled={isLoading || isLoadingBranches}
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
  );
};

export default CreateBranchModal;
