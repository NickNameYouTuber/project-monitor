import React, { useState } from 'react';
import type { Task } from '../../utils/api/tasks';
import { useTaskBoard } from '../../context/TaskBoardContext';
import TaskForm from './TaskForm';
import CloseButton from '../ui/CloseButton';

interface TaskDetailProps {
  task: Task;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const { setSelectedTask, deleteTask, columns } = useTaskBoard();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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

  // Находим колонку для задачи
  const column = columns.find(col => col.id === task.column_id);
  
  // Обработчик клика по фону модального окна
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Если активирован режим редактирования, показываем форму редактирования
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
      {/* Затемняющий фон */}
      <div className="fixed inset-0 bg-overlay z-40" onClick={handleBackdropClick} />
      {/* Модальное окно */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
        onClick={handleBackdropClick}
      >
        <div className="w-full max-w-2xl mx-auto">
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
                    aria-label="Опции задачи"
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
                          Редактировать
                        </button>
                        <button
                          onClick={handleDelete}
                          className="block w-full text-left px-4 py-2 text-sm text-state-error hover:bg-bg-secondary transition-colors"
                        >
                          Удалить
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
                  <div className="text-sm text-text-secondary mb-2">Колонка</div>
                  <div className="inline-block bg-bg-secondary rounded-full px-3 py-1 text-sm text-text-secondary">
                    {column.name}
                  </div>
                </div>
              )}
              
              {task.description && (
                <div className="mb-6">
                  <div className="text-sm text-text-secondary mb-2">Описание</div>
                  <div className="whitespace-pre-wrap bg-bg-secondary rounded-lg p-4 text-text-primary border border-border-primary">
                    {task.description || <span className="text-text-muted italic">Нет описания</span>}
                  </div>
                </div>
              )}
          
              {task.assignees && task.assignees.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm text-text-secondary mb-3">Исполнители</div>
                  <div className="flex flex-wrap gap-2">
                    {task.assignees.map((assignee) => (
                      <div 
                        key={assignee.id} 
                        className="flex items-center bg-bg-secondary rounded-full px-3 py-1 border border-border-primary"
                      >
                        <div className="h-6 w-6 rounded-full bg-bg-primary flex items-center justify-center text-xs mr-2 text-text-primary">
                          {assignee.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-text-primary">{assignee.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          
              <div className="border-t border-border-primary pt-4">
                <div className="flex justify-between text-sm text-text-muted">
                  <span>Создано: {new Date(task.created_at).toLocaleDateString()}</span>
                  <span>Обновлено: {new Date(task.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
        </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetail;
