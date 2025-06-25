import React, { useState } from 'react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            {column && (
              <span className="inline-block bg-gray-200 dark:bg-gray-600 rounded-full px-3 py-1 text-xs text-gray-700 dark:text-gray-300 mb-3">
                {column.name}
              </span>
            )}
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{task.title}</h2>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 p-1 rounded-full bg-white dark:bg-gray-800 transition-colors"
                aria-label="Task options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleEdit}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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

            <button
              onClick={handleClose}
              className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 p-1 rounded-full bg-gray-50 dark:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {task.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
              <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-gray-800 dark:text-gray-200">
                {task.description}
              </div>
            </div>
          )}
          
          {task.assignees && task.assignees.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Assignees</h3>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee) => (
                  <div 
                    key={assignee.id} 
                    className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1"
                  >
                    <div className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-500 flex items-center justify-center text-xs mr-2 text-gray-700 dark:text-gray-200">
                      {assignee.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{assignee.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(task.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
