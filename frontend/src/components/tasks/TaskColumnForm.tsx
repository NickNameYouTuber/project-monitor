import React, { useState, useEffect, useRef } from 'react';
import { TaskColumn, TaskColumnCreate, TaskColumnUpdate } from '../../utils/api/taskColumns';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';

interface TaskColumnFormProps {
  column?: TaskColumn;
  onClose: () => void;
  mode: 'create' | 'edit';
}

const TaskColumnForm: React.FC<TaskColumnFormProps> = ({ column, onClose, mode }) => {
  const { addColumn, updateColumn, columns } = useTaskBoard();
  const { projects, currentProject } = useAppContext();
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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl p-5 w-96">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          {mode === 'create' ? 'Add New Column' : 'Edit Column'}
        </h3>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="column-name" className="block text-sm font-medium text-gray-700 mb-1">
              Column Name
            </label>
            <input
              id="column-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter column name"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : mode === 'create' ? 'Create Column' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskColumnForm;
