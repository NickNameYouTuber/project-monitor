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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            {column && (
              <span className="inline-block bg-gray-200 rounded px-2 py-1 text-xs text-gray-700 mb-2">
                {column.name}
              </span>
            )}
            <h2 className="text-xl font-semibold text-gray-800">{task.title}</h2>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 hover:text-gray-700 mr-2"
              aria-label="Task options"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white z-10">
                <div className="py-1">
                  <button
                    onClick={handleEdit}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Edit Task
                  </button>
                  <button
                    onClick={handleDelete}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Delete Task
                  </button>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close task details"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        {task.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-gray-800 whitespace-pre-wrap">
              {task.description}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Assignees</h3>
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex flex-wrap">
              {task.assignees.map((assignee) => (
                <div 
                  key={assignee.id}
                  className="flex items-center bg-gray-100 rounded-full pl-1 pr-3 py-1 mr-2 mb-2"
                >
                  <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs mr-2">
                    {assignee.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-800">{assignee.username}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No assignees</p>
          )}
        </div>
        
        <div className="text-sm text-gray-500">
          <p>Created: {new Date(task.created_at).toLocaleString()}</p>
          <p>Last Updated: {new Date(task.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
