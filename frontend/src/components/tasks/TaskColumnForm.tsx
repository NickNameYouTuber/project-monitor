import React, { useState, useEffect, useRef } from 'react';
import type { TaskColumn, TaskColumnCreate, TaskColumnUpdate } from '../../utils/api/taskColumns';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';

interface TaskColumnFormProps {
  column?: TaskColumn;
  onClose: () => void;
  mode: 'create' | 'edit';
}

const TaskColumnForm: React.FC<TaskColumnFormProps> = ({ column, onClose, mode }) => {
  const { addColumn, updateColumn, columns } = useTaskBoard();
  const { currentProject } = useAppContext();
  const [name, setName] = useState(column?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Закрытие по клику вне формы
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Обработка создания/редактирования колонки
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Column name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (mode === 'create' && currentProject) {
        // Создание новой колонки
        const columnData: TaskColumnCreate = {
          name: name.trim(),
          project_id: currentProject.id,
          order: columns.length // Новая колонка добавляется в конец
        };
        await addColumn(columnData);
      } else if (mode === 'edit' && column) {
        // Обновление существующей колонки
        const updateData: TaskColumnUpdate = {
          name: name.trim()
        };
        await updateColumn(column.id, updateData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save column');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="w-full max-w-md mx-auto">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full">
          <div className="px-4 py-3 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
              {mode === 'create' ? 'Add New Column' : 'Edit Column'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {error && (
              <div className="bg-state-error-light border border-state-error text-state-error px-4 py-2 rounded mb-4">
                {error}
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-text-secondary text-sm font-bold mb-2">
                  Column Name
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary" 
                  placeholder="Enter column name"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2 text-text-secondary bg-bg-secondary hover:bg-bg-hover rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Column' : 'Update Column')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskColumnForm;
