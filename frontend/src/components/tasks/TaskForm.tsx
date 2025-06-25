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
  const { users, fetchUsers, currentUser, getDashboardMembers, currentProject, projects } = useAppContext();
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
        
        try {
          // Находим проект в списке проектов или используем currentProject
          const project = projects.find(p => p.id === projectId) || currentProject;
          
          if (project?.dashboard_id) {
            // Если у проекта есть dashboard_id, используем его для получения участников дашборда
            const members = await getDashboardMembers(project.dashboard_id);
            setProjectMembers(members);
            console.log(`Loaded ${members.length} members for dashboard ${project.dashboard_id}`);
          } else {
            console.warn('Project does not have a dashboard_id', projectId);
          }
        } catch (err) {
          console.error('Error fetching project members:', err);
        }
      }
    };
    
    fetchData();
  }, [currentUser, fetchUsers, getDashboardMembers, projectId, projects, currentProject]);
  
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
    <div className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="w-full max-w-md mx-auto">
        <div ref={modalRef} className="bg-bg-card rounded-lg shadow-xl overflow-hidden w-full max-h-[90vh] overflow-y-auto">
          <div className="px-4 py-3 sm:px-6 border-b border-border-primary flex justify-between items-center">
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
                <label className="block text-text-secondary text-sm font-bold mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
                  placeholder="Enter task title"
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-text-secondary text-sm font-bold mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
                  placeholder="Enter task description"
                  rows={4}
                ></textarea>
              </div>

              <div className="mb-6">
                <label className="block text-text-secondary text-sm font-bold mb-2">
                  Assignees
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full px-3 py-2 mb-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
                />
                
                <div className="max-h-48 overflow-y-auto border border-border-primary rounded-lg">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-text-muted">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className={`flex items-center px-3 py-2 hover:bg-primary/10 cursor-pointer ${user.isProjectMember ? 'bg-primary/10' : ''}`}
                        onClick={() => toggleAssignee(user.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(user.id)}
                          onChange={() => toggleAssignee(user.id)}
                          className="mr-3"
                        />
                        <div className="flex items-center">
                          <span className={`w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white mr-2`}>
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{user.username}</div>
                            {user.isProjectMember && (
                              <div className="text-xs text-text-muted">
                                Project member
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-hover transition w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg transition w-full sm:w-auto mb-2 sm:mb-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {mode === 'create' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    mode === 'create' ? 'Create Task' : 'Update Task'
                  )}
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
