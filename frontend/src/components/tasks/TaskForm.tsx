import React, { useState, useEffect, useRef } from 'react';
import type { Task, TaskCreate, TaskUpdate } from '../../utils/api/tasks';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';
import type { User, DashboardMember } from '../../types';

// Расширенный интерфейс для пользователя с флагом участия в проекте
interface UserWithProjectStatus extends User {
  isProjectMember: boolean;
}

interface TaskFormProps {
  task?: Task;
  columnId: string;
  projectId: string;
  onClose: () => void;
  mode: 'create' | 'edit';
}

const TaskForm: React.FC<TaskFormProps> = ({ task, columnId, projectId, onClose, mode }) => {
  const { addTask, updateTask, columns } = useTaskBoard();
  const { users, fetchUsers, currentUser, getDashboardMembers } = useAppContext();
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    task?.assignees?.map(a => a.id) || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectMembers, setProjectMembers] = useState<DashboardMember[]>([]);
  const [usersWithStatus, setUsersWithStatus] = useState<UserWithProjectStatus[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Загрузка пользователей для назначения задач
  useEffect(() => {
    const fetchData = async () => {
      if (currentUser?.token) {
        // Загружаем всех пользователей системы
        await fetchUsers(currentUser.token);
        
        // Загружаем участников данного проекта/дашборда
        try {
          const members = await getDashboardMembers(projectId);
          setProjectMembers(members);
        } catch (err) {
          console.error('Error fetching project members:', err);
        }
      }
    };
    
    fetchData();
  }, [currentUser, fetchUsers, getDashboardMembers, projectId]);
  
  // Обработка списка пользователей и участников проекта
  useEffect(() => {
    // Добавляем флаг isProjectMember к каждому пользователю
    const enhancedUsers: UserWithProjectStatus[] = users.map(user => ({
      ...user,
      isProjectMember: projectMembers.some(member => member.user_id === user.id)
    }));
    
    setUsersWithStatus(enhancedUsers);
  }, [users, projectMembers]);

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

  // Обработка создания/редактирования задачи
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (mode === 'create') {
        // Создание новой задачи
        // TaskColumn может не иметь свойства tasks в типе, но мы ожидаем его наличие
        const existingTasks = task ? [] : (columns.find(c => c.id === columnId) as any)?.tasks || [];
        const taskData: TaskCreate = {
          title: title.trim(),
          description: description.trim(),
          column_id: columnId,
          project_id: projectId,
          order: existingTasks.length, // Новая задача добавляется в конец
          assignee_ids: selectedAssignees
        };
        await addTask(taskData);
      } else if (mode === 'edit' && task) {
        // Обновление существующей задачи
        const updateData: TaskUpdate = {
          title: title.trim(),
          description: description.trim(),
          assignee_ids: selectedAssignees
        };
        await updateTask(task.id, updateData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация пользователей по поисковому запросу
  const filteredUsers = usersWithStatus.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  )
  // Сортируем: сперва участники проекта, потом по имени
  .sort((a, b) => {
    if (a.isProjectMember !== b.isProjectMember) {
      return a.isProjectMember ? -1 : 1;
    }
    return a.username.localeCompare(b.username);
  });

  // Обработка выбора/снятия выбора исполнителя
  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="w-full max-w-md mx-auto">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-h-[90vh] overflow-y-auto">
          <div className="px-4 py-3 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-semibold text-text-primary">
              {mode === 'create' ? 'Create New Task' : 'Edit Task'}
            </h3>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-secondary transition-colors"
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
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter task title"
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter task description"
                  rows={4}
                ></textarea>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Assignees
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary mb-2"
                  placeholder="Search users..."
                />
                
                <div className="max-h-40 overflow-y-auto border border-border-primary rounded-lg bg-bg-secondary">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => toggleAssignee(user.id)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${
                        selectedAssignees.includes(user.id) 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' 
                          : ''
                      } ${user.isProjectMember ? 'font-medium' : ''}`}
                    >
                      <span className="text-gray-800 dark:text-white">{user.username}</span>
                      {user.isProjectMember && <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(Project Member)</span>}
                      {selectedAssignees.includes(user.id) && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                      No users found
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Task' : 'Update Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
