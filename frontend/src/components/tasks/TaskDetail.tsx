import React, { useState, useEffect } from 'react';
import type { Task } from '../../utils/api/tasks';
import type { Comment } from '../../utils/api/comments';
import type { CommitInfo } from '../../utils/api/repositories';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';
import TaskForm from './TaskForm';
import CloseButton from '../ui/CloseButton';
import TaskComments from '../comments/TaskComments';
import commentsApi from '../../utils/api/comments';
import repositoriesApi from '../../utils/api/repositories';
import taskRepositoryApi from '../../utils/api/taskRepository';
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
  // Нам не нужно хранить все репозитории, только выбранный ID
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [taskBranches, setTaskBranches] = useState<any[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchSuggestions, setBranchSuggestions] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
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

  useEffect(() => {
    const fetchComments = async () => {
      if (currentUser?.token) {
        setIsLoadingComments(true);
        try {
          const data = await commentsApi.getByTask(task.id, currentUser.token);
          setComments(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error fetching comments:', error);
          setComments([]);
        } finally {
          setIsLoadingComments(false);
        }
      }
    };
    
    const fetchRepositories = async () => {
      if (currentUser?.token && task.project_id) {
        setIsLoadingRepositories(true);
        try {
          const data = await repositoriesApi.getAll(currentUser.token, task.project_id);
          if (Array.isArray(data) && data.length > 0) {
            setSelectedRepositoryId(data[0].id);
          }
        } catch (error) {
          console.error('Error fetching repositories:', error);
          setSelectedRepositoryId(null);
        } finally {
          setIsLoadingRepositories(false);
        }
      }
    };
    
    const fetchTaskBranches = async () => {
      if (currentUser?.token && task.id) {
        setIsLoadingBranches(true);
        try {
          const data = await taskRepositoryApi.getTaskBranches(task.id, currentUser.token);
          const branchesData = Array.isArray(data) ? data : [];
          setTaskBranches(branchesData);
          
          // Если есть ветка, загрузим её коммиты
          if (branchesData.length > 0) {
            fetchBranchCommits(branchesData[0]);
          }
        } catch (error) {
          console.error('Error fetching task branches:', error);
          setTaskBranches([]);
        } finally {
          setIsLoadingBranches(false);
        }
      }
    };
    
    fetchComments();
    fetchRepositories();
    fetchTaskBranches();
    
    // Загружаем доступные ветки из репозитория
    const fetchAvailableBranches = async () => {
      if (currentUser?.token && selectedRepositoryId) {
        try {
          const branches = await repositoriesApi.git.getBranches(selectedRepositoryId, currentUser.token);
          setAvailableBranches(branches.map(branch => branch.name));
        } catch (error) {
          console.error('Error fetching available branches:', error);
          setAvailableBranches([]);
        }
      }
    };
    
    if (selectedRepositoryId) {
      fetchAvailableBranches();
    }
  }, [task.id, task.project_id, currentUser?.token, selectedRepositoryId]);
  
  // Загрузка коммитов ветки
  const fetchBranchCommits = async (branch: any) => {
    if (!currentUser?.token || !branch.repository_id && !branch.repositoryId) return;
    
    const repoId = branch.repository_id || branch.repositoryId;
    const branchName = branch.branch_name || branch.branchName;
    
    if (!repoId || !branchName) return;
    
    setIsLoadingCommits(true);
    try {
      const commitsData = await repositoriesApi.git.getCommits(
        repoId,
        branchName,
        currentUser.token,
        5 // Ограничиваем последними 5 коммитами
      );
      setCommits(commitsData);
    } catch (error) {
      console.error('Error fetching branch commits:', error);
      setCommits([]);
    } finally {
      setIsLoadingCommits(false);
    }
  };
  
  // Обрабатываем ввод имени ветки и показываем подсказки
  const handleBranchNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBranchName(value);
    
    if (value.trim() === '') {
      setBranchSuggestions([]);
      return;
    }
    
    // Фильтруем доступные ветки по введенному тексту
    const suggestions = availableBranches.filter(branch => 
      branch.toLowerCase().includes(value.toLowerCase())
    );
    
    setBranchSuggestions(suggestions);
  };
  
  // Создаем или привязываем ветку
  const handleCreateOrAttachBranch = async () => {
    if (!currentUser?.token || !selectedRepositoryId || !branchName.trim()) return;
    
    try {
      // Проверяем, существует ли такая ветка
      const branchExists = availableBranches.includes(branchName);
      
      if (branchExists) {
        // Если ветка существует, привязываем её к задаче
        // Здесь должен быть API-вызов для привязки существующей ветки
        // Пока просто создадим системный комментарий
        await commentsApi.create(
          { 
            task_id: task.id, 
            content: `🔄 Привязана ветка **${branchName}**`,
            is_system: true 
          },
          currentUser.token
        );
      } else {
        // Если ветки нет, создаем новую через API
        await repositoriesApi.git.createBranch(
          selectedRepositoryId, 
          {
            name: branchName,
            task_id: task.id
          }, 
          currentUser.token
        );
      }
      
      // Обновляем комментарии и ветки
      const commentsData = await commentsApi.getByTask(task.id, currentUser.token);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      
      const branchesData = await taskRepositoryApi.getTaskBranches(task.id, currentUser.token);
      setTaskBranches(Array.isArray(branchesData) ? branchesData : []);
      
      // Сбрасываем поле ввода
      setBranchName('');
      setBranchSuggestions([]);
    } catch (error) {
      console.error('Error creating/attaching branch:', error);
      alert('Не удалось создать или привязать ветку. Пожалуйста, попробуйте еще раз.');
    }
  };
  
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
                <div className="text-sm text-text-secondary mb-3 font-bold">Ветка задачи</div>
                
                {isLoadingBranches || isLoadingRepositories ? (
                  <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary flex justify-center items-center">
                    <svg className="animate-spin h-5 w-5 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-text-muted">Загрузка веток...</span>
                  </div>
                ) : (
                  <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
                    {taskBranches.length > 0 ? (
                      <div className="space-y-2">
                        {taskBranches.map(branch => (
                          <div key={branch.branch_name || branch.branchName} className="border border-border-primary rounded-md p-2">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium text-text-primary">{branch.branch_name || branch.branchName}</div>
                                <div className="text-xs text-text-muted">Репозиторий: {branch.repository_name || branch.repositoryName}</div>
                                <div className="text-xs text-text-muted">Создана: {new Date(branch.created_at).toLocaleDateString()}</div>
                              </div>
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Активная</div>
                            </div>
                            
                            {/* Список коммитов */}
                            {isLoadingCommits ? (
                              <div className="mt-2 p-2 bg-bg-card rounded text-center">
                                <div className="flex justify-center items-center">
                                  <svg className="animate-spin h-4 w-4 text-primary mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="text-sm text-text-muted">Загрузка коммитов...</span>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2">
                                <div className="text-xs font-medium border-b border-border-primary pb-1 mb-1">Последние коммиты:</div>
                                {commits.length > 0 ? (
                                  <div className="max-h-32 overflow-auto">
                                    {commits.map((commit) => (
                                      <div key={commit.hash} className="text-xs py-1 border-b border-border-primary last:border-b-0">
                                        <div className="flex items-center">
                                          <span className="bg-bg-secondary px-1 py-0.5 rounded text-text-muted mr-1">{commit.short_hash.substring(0, 7)}</span>
                                          <span className="text-text-primary truncate">{commit.message}</span>
                                        </div>
                                        <div className="text-text-muted mt-0.5">
                                          <span>{commit.author}</span> &bull; <span>{new Date(commit.date).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-xs text-text-muted italic">
                                    Нет коммитов в этой ветке
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 text-center text-text-muted">К задаче пока не привязаны ветки</div>
                    )}
                    
                    {taskBranches.length === 0 && (
                      <div className="relative mt-2">
                        <div className="flex space-x-2">
                          <div className="flex-grow relative">
                            <input
                              type="text"
                              value={branchName}
                              onChange={handleBranchNameChange}
                              placeholder="Введите имя ветки"
                              className="w-full rounded-md bg-bg-card border border-border-primary text-text-primary px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {branchSuggestions.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-bg-card border border-border-primary rounded-md shadow-lg max-h-60 overflow-auto">
                                {branchSuggestions.map((suggestion, index) => (
                                  <div
                                    key={index}
                                    className="px-3 py-2 hover:bg-bg-secondary cursor-pointer text-text-primary"
                                    onClick={() => {
                                      setBranchName(suggestion);
                                      setBranchSuggestions([]);
                                    }}
                                  >
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            className="px-4 py-2 bg-[#7AB988] text-white rounded-md hover:bg-[#5DA570] transition-colors flex items-center whitespace-nowrap"
                            onClick={handleCreateOrAttachBranch}
                            disabled={!selectedRepositoryId || !branchName.trim()}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            Привязать
                          </button>
                        </div>
                      </div>
                    )}
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