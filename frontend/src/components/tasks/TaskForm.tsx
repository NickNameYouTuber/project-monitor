import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTaskBoard } from '../../context/TaskBoardContext';
import type { Task, TaskCreate, TaskUpdate } from '../../utils/api/tasks';
import type { User, DashboardMember } from '../../types';

interface Assignee {
  id: string;
  username: string;
}
import { useAppContext } from '../../utils/AppContext';
import CloseButton from '../ui/CloseButton';

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
    task?.assignees?.map((a: Assignee) => a.id) || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectMembers, setProjectMembers] = useState<DashboardMember[]>([]);
  const [usersWithStatus, setUsersWithStatus] = useState<UserWithProjectStatus[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Загрузка пользователей для назначения задач
  // useRef для отслеживания уже запущенных запросов, чтобы избежать бесконечных циклов
  const loadedRef = useRef<{[key: string]: boolean}>({});
  
  useEffect(() => {
    // Используем projectId как ключ для отслеживания загрузки
    const key = `${projectId}`;
    
    // Проверяем, что данные еще не были загружены для этого проекта
    if (loadedRef.current[key]) {
      return;
    }
    
    // Отмечаем, что загрузка началась
    loadedRef.current[key] = true;
    
    const fetchData = async () => {
      if (!currentUser?.token) return;
      
      try {
        // Загружаем всех пользователей системы
        await fetchUsers(currentUser.token);
        
        // Чтобы избежать бесконечных запросов, сначала проверим локально
        let dashboardId = null;
        
        // Попытка найти dashboard_id в текущих данных
        // Сначала проверим currentProject
        if (currentProject?.id === projectId && currentProject?.dashboard_id) {
          dashboardId = currentProject.dashboard_id;
        } 
        // Затем поищем в списке проектов
        else {
          const project = projects.find(p => p.id === projectId);
          if (project?.dashboard_id) {
            dashboardId = project.dashboard_id;
          }
        }
        
        if (dashboardId) {
          // Если нашли dashboard_id, получаем участников дашборда
          const members = await getDashboardMembers(dashboardId);
          setProjectMembers(members);
        }
      } catch (err) {
        console.error('Error fetching data for TaskForm:', err);
      }
    };
    
    fetchData();
  }, [projectId, currentUser?.token]); // Используем только неизменяемые значения как зависимости
  
  // Обработка списка пользователей и участников проекта
  useEffect(() => {
    // Проверяем, есть ли текущий пользователь в списке пользователей
    let usersList = [...users];
    
    // Если текущий пользователь не найден в списке, добавляем его
    if (currentUser && !users.some(u => u.id === currentUser.id)) {
      console.log('Adding current user to the list:', currentUser);
      usersList = [...usersList, currentUser];
    }
    
    // Добавляем флаг isProjectMember к каждому пользователю
    const enhancedUsers: UserWithProjectStatus[] = usersList.map(user => ({
      ...user,
      // Считаем пользователя участником проекта, если:
      // 1. Он в списке участников дашборда ИЛИ
      // 2. Это текущий пользователь
      isProjectMember: Boolean(projectMembers.some(member => member.user_id === user.id) || 
                       (currentUser && user.id === currentUser.id))
    }));
    
    // Не фильтруем ранее выбранных пользователей, поскольку мы можем редактировать существующие задачи
    
    setUsersWithStatus(enhancedUsers);
    
    // Добавляем консольный вывод для отладки
    console.log('Users with status:', enhancedUsers);
    console.log('Project members:', projectMembers);
    console.log('Current user:', currentUser);
  }, [users, projectMembers, currentUser]);

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
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        const existingTasks = task ? [] : (columns.find((c: any) => c.id === columnId) as any)?.tasks || [];
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

  // Фильтрация пользователей на основе поиска
  const filteredUsers: UserWithProjectStatus[] = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return usersWithStatus
      // Фильтруем по поисковой строке
      .filter((user: UserWithProjectStatus) => user.username.toLowerCase().includes(searchLower))
      // Сортируем: сначала участники проекта, затем по алфавиту
      .sort((a: UserWithProjectStatus, b: UserWithProjectStatus) => {
        if (a.isProjectMember !== b.isProjectMember) {
          return a.isProjectMember ? -1 : 1; // Участники проекта всегда выше
        }
        return a.username.localeCompare(b.username); // Затем сортируем по имени
      });
  }, [searchTerm, usersWithStatus]);

  // Обработка выбора/снятия выбора исполнителя
  const toggleAssignee = (userId: string, isProjectMember: boolean) => {
    // Разрешаем выбирать только участников проекта
    if (!isProjectMember) {
      return; // Если пользователь не участник, ничего не делаем
    }
    
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  return (
    <>
      {/* Полупрозрачный фон (модальная подложка) */}
      <div
        className="fixed inset-0 bg-overlay z-40"
        onClick={(e) => {
          // Закрытие при клике вне модального окна
          if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
          }
        }}
      />
      {/* Модальное окно */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto">
          <div ref={modalRef} className="bg-bg-card rounded-lg shadow-xl overflow-hidden w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 sm:px-6 border-b border-border-primary flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-semibold text-text-primary">
                {mode === 'create' ? 'Добавить задачу' : 'Редактировать задачу'}
              </h3>
              <CloseButton onClick={onClose} />
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
                <div className="text-xs text-text-muted mb-2">Only project members can be assigned to tasks</div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search members..."
                  className="w-full px-3 py-2 mb-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-bg-secondary text-text-primary"
                />
                
                <div className="max-h-48 overflow-y-auto border border-border-primary rounded-lg">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-text-muted">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map((user: UserWithProjectStatus) => (
                      <div
                        key={user.id}
                        className={`flex items-center px-3 py-2 hover:bg-primary/10 cursor-pointer ${user.isProjectMember ? 'bg-primary/10' : 'opacity-50'}`}
                        onClick={() => toggleAssignee(user.id, user.isProjectMember)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(user.id)}
                          onChange={() => toggleAssignee(user.id, user.isProjectMember)}
                          className="mr-3"
                          disabled={!user.isProjectMember}
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
    </>
  );
};

export default TaskForm;
