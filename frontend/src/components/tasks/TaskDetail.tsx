import React, { useState, useEffect } from 'react';
import type { Task } from '../../utils/api/tasks';
import type { Comment as CommentType } from '../../utils/api/comments';

// Расширяем тип комментария для поддержки системных сообщений
interface Comment extends CommentType {
  is_system?: boolean;
}

import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';
import TaskForm from './TaskForm';
import CloseButton from '../ui/CloseButton';
import TaskComments from '../comments/TaskComments';
import commentsApi from '../../utils/api/comments';
import repositoriesApi from '../../utils/api/repositories';
import taskRepositoryApi from '../../utils/api/taskRepository';
import CreateBranchModal from '../repository/CreateBranchModal';

// Интерфейс для унифицированного отображения комментариев и коммитов
interface UnifiedTimelineItem {
  id: string;
  content: string;
  user_id?: string;
  created_at: string;
  is_system: boolean;
  type: 'comment' | 'commit';
  commit_hash?: string;
  task_id?: string;
}

interface TaskDetailProps {
  task: Task;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const { setSelectedTask, deleteTask, columns } = useTaskBoard();
  const { currentUser } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [timelineItems, setTimelineItems] = useState<UnifiedTimelineItem[]>([]);
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [taskBranches, setTaskBranches] = useState<any[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchSuggestions, setBranchSuggestions] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

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

  const mergeCommentsAndCommits = (comments: Comment[], commits?: any[]) => {
    console.log('Объединение комментариев и коммитов:', { comments: comments.length, commits: commits?.length || 0 });
    
    const safeCommits = commits || [];
    const commitItems: UnifiedTimelineItem[] = safeCommits.map(commit => ({
      id: commit.hash || `commit-${Math.random().toString(36).substring(2, 11)}`,
      content: `💻 Коммит: **${commit.short_hash || commit.hash?.substring(0, 7)}**: ${commit.message}

Автор: ${commit.author} • ${new Date(commit.date).toLocaleString()}`,
      created_at: commit.date || commit.created_at || new Date().toISOString(),
      is_system: true,
      type: 'commit',
      commit_hash: commit.hash || '',
      user_id: commit.author || 'Git Commit'
    }));
    
    const commentItems: UnifiedTimelineItem[] = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      user_id: comment.user_id,
      created_at: comment.created_at,
      is_system: comment.is_system || false,
      type: 'comment',
      task_id: comment.task_id
    }));
    
    const merged = [...commentItems, ...commitItems].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    console.log('Итоговый объединенный список элементов для отображения:', merged.length);
    setTimelineItems(merged);
    setIsLoadingComments(false);
    return merged;
  };

  const fetchComments = async (): Promise<Comment[]> => {
    if (!currentUser?.token) return [];
    setIsLoadingComments(true);
    try {
      const data = await commentsApi.getByTask(task.id, currentUser.token);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    } finally {
      setIsLoadingComments(false);
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
        return branchesData;
      } catch (error) {
        console.error('Error fetching task branches:', error);
        setTaskBranches([]);
        return [];
      } finally {
        setIsLoadingBranches(false);
      }
    }
    return [];
  };

  const fetchBranchCommits = async (branchesData: any[]): Promise<any[]> => {
    if (!currentUser?.token || branchesData.length === 0) return [];
    const activeBranch = branchesData[0]; // Берем первую ветку (обычно привязана только одна)
    if (!activeBranch) return [];
    const repositoryId = activeBranch.repository_id || activeBranch.repositoryId;
    const branchName = activeBranch.branch_name || activeBranch.branchName;

    if (!repositoryId || !branchName) return [];

    try {
      const commitData = await repositoriesApi.git.getCommits(repositoryId, branchName, currentUser.token, 50);
      console.log('Получены коммиты ветки:', commitData);
      return Array.isArray(commitData) ? commitData : [];
    } catch (error) {
      console.error('Error fetching branch commits:', error);
      return [];
    }
  };



  const loadAllData = async () => {
    try {
      // Загружаем все данные последовательно для обеспечения правильного порядка
      const commentsData = await fetchComments();
      console.log('Загружены комментарии:', commentsData.length);
      setComments(commentsData);
      
      // Загружаем ветки и затем коммиты, если есть привязанная ветка
      const branchesData = await fetchTaskBranches();
      console.log('Загружены ветки:', branchesData.length);
      
      if (branchesData.length > 0) {
        console.log('Есть привязанная ветка, загружаем коммиты');
        const commitsData = await fetchBranchCommits(branchesData);
        console.log('Объединяем комментарии и коммиты');
        mergeCommentsAndCommits(commentsData, commitsData);
      } else {
        console.log('Нет привязанной ветки, показываем только комментарии');
        mergeCommentsAndCommits(commentsData, []);
      }
      
      // Загружаем репозитории для других частей компонента
      await fetchRepositories();
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      // В случае ошибки все равно показываем комментарии, если они загружены
      if (comments.length > 0) {
        mergeCommentsAndCommits(comments, []);
      }
    }
  };

  // Эффект для загрузки всех данных при первом рендере или изменении id задачи
  useEffect(() => {
    console.log('Загружаем данные для задачи:', task.id);
    loadAllData();
  }, [task.id, task.project_id, currentUser?.token]);
  
  // Отдельный эффект для загрузки списка доступных веток при выборе репозитория
  useEffect(() => {
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
  }, [selectedRepositoryId, currentUser?.token]);

  const handleBranchNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBranchName(value);

    if (value.trim() === '') {
      setBranchSuggestions([]);
      return;
    }

    const suggestions = availableBranches.filter(branch =>
      branch.toLowerCase().includes(value.toLowerCase())
    );
    setBranchSuggestions(suggestions);
  };

  const handleCreateOrAttachBranch = async () => {
    if (!currentUser?.token || !selectedRepositoryId || !branchName.trim()) return;

    try {
      const branchExists = availableBranches.includes(branchName);

      if (branchExists) {
        await commentsApi.create(
          {
            task_id: task.id,
            content: `🔄 Привязана ветка **${branchName}**`,
            is_system: true
          },
          currentUser.token
        );
      } else {
        await repositoriesApi.git.createBranch(
          selectedRepositoryId,
          {
            name: branchName,
            task_id: task.id
          },
          currentUser.token
        );
      }

      const commentsData = await commentsApi.getByTask(task.id, currentUser.token);
      setComments(Array.isArray(commentsData) ? commentsData : []);

      const branchesData = await taskRepositoryApi.getTaskBranches(task.id, currentUser.token);
      setTaskBranches(Array.isArray(branchesData) ? branchesData : []);

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
    <div>
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
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
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
                      let sortedAssignees = [...task.assignees];
                      const currentUserIndex = currentUser
                        ? sortedAssignees.findIndex(assignee => assignee.id === currentUser?.id)
                        : -1;

                      if (currentUserIndex > 0) {
                        const currentUserAssignee = sortedAssignees[currentUserIndex];
                        sortedAssignees.splice(currentUserIndex, 1);
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
                          <div key={branch.branch_name || branch.branchName} className="flex items-center justify-between border border-border-primary rounded-md p-2">
                            <div>
                              <div className="font-medium text-text-primary">{branch.branch_name || branch.branchName}</div>
                              <div className="text-xs text-text-muted">Репозиторий: {branch.repository_name || branch.repositoryName}</div>
                              <div className="text-xs text-text-muted">Создана: {new Date(branch.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Активная</div>
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
                <div className="task-comments">
                  <h3 className="task-section-title">Комментарии и история</h3>
                  <TaskComments
                    taskId={task.id}
                    comments={timelineItems.length > 0 ? timelineItems.map(item => ({
                      id: item.id,
                      task_id: item.task_id || task.id,
                      user_id: item.user_id || '',
                      username: item.type === 'commit' ? 'Git Commit' : '',
                      content: item.content,
                      created_at: item.created_at,
                      updated_at: item.created_at,
                      is_system: item.is_system
                    })) as Comment[] : comments}
                    onAddComment={handleAddComment}
                    onUpdateComment={handleUpdateComment}
                    onDeleteComment={handleDeleteComment}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showCreateBranchModal && selectedRepositoryId && (
        <CreateBranchModal
          repositoryId={selectedRepositoryId!}
          taskId={task.id}
          onClose={() => setShowCreateBranchModal(false)}
          onBranchCreated={() => {
            if (currentUser?.token) {
              commentsApi.getByTask(task.id, currentUser.token).then(data => {
                setComments(Array.isArray(data) ? data : []);
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default TaskDetail;