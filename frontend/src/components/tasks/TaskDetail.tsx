import React, { useState, useEffect } from 'react';
import type { Task } from '../../utils/api/tasks';
import type { Comment } from '../../utils/api/comments';
import type { Repository } from '../../utils/api/repositories';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';
import TaskForm from './TaskForm';
import CloseButton from '../ui/CloseButton';
import TaskComments from '../comments/TaskComments';
import commentsApi from '../../utils/api/comments';
import repositoriesApi from '../../utils/api/repositories';
import CreateBranchModal from '../repository/CreateBranchModal';

interface TaskDetailProps {
  task: Task;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const { setSelectedTask, deleteTask, columns } = useTaskBoard();
  const { currentUser } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [projectRepositories, setProjectRepositories] = useState<Repository[]>([]);
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  
  const handleClose = () => {
    setSelectedTask(null);
  };
  
  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      setSelectedTask(null);
    }
    setShowMenu(false);
  };

  const column = columns.find(col => col.id === task.column_id);
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Загрузка комментариев
  useEffect(() => {
    const fetchComments = async () => {
      if (currentUser?.token) {
        setIsLoadingComments(true);
        try {
          const data = await commentsApi.getByTask(task.id, currentUser.token);
          // Проверяем, что полученные данные - это массив
          setComments(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error fetching comments:', error);
        } finally {
          setIsLoadingComments(false);
        }
      }
    };
    
    fetchComments();
  }, [task.id, currentUser?.token]);
  
  // Загрузка репозиториев проекта
  useEffect(() => {
    const fetchProjectRepositories = async () => {
      if (currentUser?.token && task.project_id) {
        setIsLoadingRepositories(true);
        try {
          const repositories = await repositoriesApi.getAll(currentUser.token, task.project_id);
          setProjectRepositories(repositories);
          
          // Если есть хотя бы один репозиторий, выбираем его по умолчанию
          if (repositories.length > 0) {
            setSelectedRepositoryId(repositories[0].id);
          }
        } catch (error) {
          console.error('Error fetching project repositories:', error);
        } finally {
          setIsLoadingRepositories(false);
        }
      }
    };
    
    fetchProjectRepositories();
  }, [task.project_id, currentUser?.token]);
  
  // Обработчики для работы с комментариями
  const handleAddComment = async (content: string) => {
    if (!currentUser?.token) return;
    
    try {
      const newComment = await commentsApi.create(
        { task_id: task.id, content },
        currentUser.token
      );
      setComments(prevComments => [...prevComments, newComment]);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };
  
  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!currentUser?.token) return;
    
    try {
      await commentsApi.update(commentId, { content }, currentUser.token);
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId ? { ...comment, content, updated_at: new Date().toISOString() } : comment
        )
      );
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser?.token) return;
    
    try {
      await commentsApi.delete(commentId, currentUser.token);
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (isEditing) {
    return (
      <TaskForm 
        task={task}
        columnId={task.column_id}
        projectId={task.project_id}
        onClose={() => setIsEditing(false)}
        mode="edit"
      />
    );
  }
  
  return (
    <>
      <div className="fixed inset-0 bg-overlay z-40" onClick={handleBackdropClick} />
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
        onClick={handleBackdropClick}
      >
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto">
          <div ref={modalRef} className="bg-bg-card rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 sm:px-6 border-b border-border-primary flex justify-between items-center">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-text-primary">{task.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-text-muted hover:text-text-secondary p-1 rounded-full transition-colors bg-bg-secondary"
                    aria-label="Task options"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-bg-card border border-border-primary z-10">
                      <div className="py-1">
                        <button
                          onClick={handleEdit}
                          className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition-colors bg-bg-secondary"
                        >
                          Edit Task
                        </button>
                        <button
                          onClick={handleDelete}
                          className="block w-full text-left px-4 py-2 text-sm text-state-error hover:bg-bg-secondary transition-colors bg-bg-secondary"
                        >
                          Delete Task
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <CloseButton onClick={handleClose} />
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {column && (
                <div className="mb-4">
                  <div className="text-sm text-text-secondary mb-2 font-bold">Column</div>
                  <div className="inline-block bg-bg-secondary rounded-full px-3 py-1 text-sm text-text-secondary">
                    {column.name}
                  </div>
                </div>
              )}
              {task.description && (
                <div className="mb-6">
                  <div className="text-sm text-text-secondary mb-2 font-bold">Description</div>
                  <div className="whitespace-pre-wrap bg-bg-secondary rounded-lg p-4 text-text-primary border border-border-primary">
                    {task.description || <span className="text-text-muted italic">No description</span>}
                  </div>
                </div>
              )}
              {task.assignees && task.assignees.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm text-text-secondary mb-3 font-bold">Assignees</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Сортируем assignees так, чтобы текущий пользователь был первым
                      let sortedAssignees = [...task.assignees];
                      const currentUserIndex = currentUser 
                        ? sortedAssignees.findIndex(assignee => assignee.id === currentUser.id)
                        : -1;
                        
                      if (currentUserIndex > 0) {
                        // Извлекаем текущего пользователя
                        const currentUserAssignee = sortedAssignees[currentUserIndex];
                        // Удаляем его с текущей позиции
                        sortedAssignees.splice(currentUserIndex, 1);
                        // Вставляем в начало списка
                        sortedAssignees.unshift(currentUserAssignee);
                      }
                      
                      return sortedAssignees.map((assignee) => {
                        const isCurrentUser = currentUser?.id === assignee.id;
                        return (
                          <div 
                            key={assignee.id} 
                            className={`flex items-center rounded-full px-3 py-1 border ${isCurrentUser 
                              ? 'border-state-success text-state-success bg-bg-card' 
                              : 'bg-bg-secondary border-border-primary'}`}
                          >
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs mr-2 ${isCurrentUser 
                              ? 'bg-state-success text-white' 
                              : 'bg-bg-primary text-text-primary'}`}>
                              {assignee.username.charAt(0).toUpperCase()}
                            </div>
                            <span className={`text-sm ${isCurrentUser ? 'text-state-success' : 'text-text-primary'}`}>
                              {assignee.username}
                              {isCurrentUser && (
                                <span className="ml-1 text-xs">(you)</span>
                              )}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              {/* Блок репозиториев и создания ветки */}
              <div className="mb-6">
                <div className="text-sm text-text-secondary mb-3 font-bold">Связанные репозитории</div>
                
                {isLoadingRepositories ? (
                  <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary flex justify-center items-center">
                    <svg className="animate-spin h-5 w-5 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-text-muted">Загрузка репозиториев...</span>
                  </div>
                ) : projectRepositories.length > 0 ? (
                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
                    <div className="mb-4 flex items-center justify-between">
                      <select
                        className="flex-grow rounded-md bg-bg-card border border-border-primary text-text-primary px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                        value={selectedRepositoryId || ''}
                        onChange={(e) => setSelectedRepositoryId(e.target.value)}
                      >
                        {projectRepositories.map(repo => (
                          <option key={repo.id} value={repo.id}>{repo.name}</option>
                        ))}
                      </select>
                      <button
                        className="ml-3 px-4 py-2 bg-[#7AB988] text-white rounded-md hover:bg-[#5DA570] transition-colors flex items-center"
                        onClick={() => setShowCreateBranchModal(true)}
                        disabled={!selectedRepositoryId}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Создать ветку
                      </button>
                    </div>
                    <div className="text-xs text-text-muted">
                      При создании ветки будет добавлен системный комментарий, а новые коммиты будут автоматически отслеживаться.
                    </div>
                  </div>
                ) : (
                  <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary text-center">
                    <div className="flex justify-center mb-4">
                      <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-text-secondary mb-2">К этому проекту пока не подключены репозитории</p>
                    <p className="text-xs text-text-muted">Добавьте репозиторий к проекту для отслеживания веток и коммитов</p>
                  </div>
                )}
              </div>
              
              <div className="border-t border-border-primary pt-4 mb-6">
                <div className="flex justify-between text-sm text-text-muted">
                  <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                  <span>Updated: {new Date(task.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* Секция комментариев с поддержкой Markdown */}
              {isLoadingComments ? (
                <div className="text-center py-6 text-text-muted">
                  <div className="flex justify-center items-center">
                    <svg className="animate-spin h-5 w-5 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading comments...
                  </div>
                </div>
              ) : (
                <TaskComments 
                  taskId={task.id}
                  comments={comments}
                  onAddComment={handleAddComment}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Модальное окно создания ветки */}
      {showCreateBranchModal && selectedRepositoryId && (
        <CreateBranchModal
          repositoryId={selectedRepositoryId}
          taskId={task.id}
          onClose={() => setShowCreateBranchModal(false)}
          onBranchCreated={() => {
            // После создания ветки обновляем комментарии
            if (currentUser?.token) {
              commentsApi.getByTask(task.id, currentUser.token).then(data => {
                setComments(Array.isArray(data) ? data : []);
              });
            }
          }}
        />
      )}
    </>
  );
};

export default TaskDetail;