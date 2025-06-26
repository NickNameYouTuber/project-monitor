import React, { useState, useEffect } from 'react';
import type { Task } from '../../utils/api/tasks';
import type { Comment } from '../../utils/api/comments';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';
import TaskForm from './TaskForm';
import CloseButton from '../ui/CloseButton';
import TaskComments from '../comments/TaskComments';
import commentsApi from '../../utils/api/comments';

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
                    className="text-text-muted hover:text-text-secondary p-1 rounded-full transition-colors"
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
                          className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition-colors"
                        >
                          Edit Task
                        </button>
                        <button
                          onClick={handleDelete}
                          className="block w-full text-left px-4 py-2 text-sm text-state-error hover:bg-bg-secondary transition-colors"
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
                    {task.assignees.map((assignee) => {
                      const isCurrentUser = currentUser?.id === assignee.id;
                      return (
                        <div 
                          key={assignee.id} 
                          className={`flex items-center rounded-full px-3 py-1 border ${isCurrentUser 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-bg-secondary border-border-primary'}`}
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs mr-2 ${isCurrentUser 
                            ? 'bg-primary text-white' 
                            : 'bg-bg-primary text-text-primary'}`}>
                            {assignee.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-text-primary">
                            {assignee.username}
                            {isCurrentUser && (
                              <span className="ml-1 text-xs text-primary">(you)</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
    </>
  );
};

export default TaskDetail;