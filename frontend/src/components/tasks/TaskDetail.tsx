import React, { useState, useRef } from 'react';
import type { Task } from '../../utils/api/tasks';
import { useTaskBoard } from '../../context/TaskBoardContext';
import TaskForm from './TaskForm';

interface TaskDetailProps {
  task: Task;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  const { setSelectedTask, deleteTask, columns } = useTaskBoard();
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      handleClose();
    }
  };

  // Находим колонку для задачи
  const column = columns.find((col) => col.id === task.column_id);

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
      {/* Полупрозрачный фон (модальная подложка) */}
      <div className="fixed inset-0 bg-overlay z-40" onClick={handleBackdropClick} />
      {/* Модальное окно */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0" onClick={handleBackdropClick}>
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto">
          <div ref={modalRef} className="bg-bg-card rounded-lg shadow-xl overflow-hidden w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 sm:px-6 border-b border-border-primary flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-semibold text-text-primary">{task.title}</h3>
              <button
                onClick={handleClose}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 p-1 rounded-full bg-gray-50 dark:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {column && (
                <div className="mb-3">
                  <span className="inline-block bg-bg-secondary rounded-full px-3 py-1 text-xs text-text-secondary">
                    {column.name}
                  </span>
                </div>
              )}
              {task.description && (
                <p className="text-text-secondary mb-4">{task.description}</p>
              )}
              <div className="mb-4">
                <h4 className="text-text-primary font-bold">Исполнители:</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {task.assignees && task.assignees.length > 0 ? (
                    task.assignees.map((assignee) => (
                      <div key={assignee.id} className={`px-2 py-0.5 rounded-full text-xs bg-bg-secondary text-text-secondary`} title={assignee.username}>
                        {assignee.username}
                      </div>
                    ))
                  ) : (
                    <p className="text-text-muted">Нет назначенных исполнителей</p>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                  <span>Updated: {new Date(task.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4 mt-4">
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-text-muted hover:text-text-secondary p-1 rounded-full bg-bg-card transition-colors"
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
                          className="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition-colors"
                        >
                          Edit Task
                        </button>
                        <button
                          onClick={handleDelete}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          Delete Task
                        </button>
                      </div>
                    </div>
                  )}
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
