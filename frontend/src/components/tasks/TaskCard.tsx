import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import type { Task } from '../../utils/api/tasks';
import { useTaskBoard } from '../../context/TaskBoardContext';

interface TaskCardProps {
  task: Task;
  index: number;
}

// Helper functions for styling based on task properties
const getPriorityColor = (task: Task) => {
  // Проверка, есть ли свойство priority в типе Task
  const priority = (task as any).priority;
  if (!priority) return 'border-slate-300';
  
  switch(priority.toLowerCase()) {
    case 'high':
      return 'border-red-500';
    case 'medium':
      return 'border-yellow-500';
    case 'low':
      return 'border-green-500';
    default:
      return 'border-slate-300';
  }
};

const getPriorityBadgeColor = (task: Task) => {
  // Проверка, есть ли свойство priority в типе Task
  const priority = (task as any).priority;
  if (!priority) return '';
  
  switch(priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const { setSelectedTask } = useTaskBoard();
  
  // Открытие модального окна с деталями задачи
  const handleCardClick = () => {
    setSelectedTask(task);
  };
  
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleCardClick}
          className={`task-card p-4 mb-3 bg-white rounded-lg border-l-4 ${getPriorityColor(task)} shadow-sm cursor-pointer hover:shadow-md transition-all duration-200
                    ${snapshot.isDragging ? 'shadow-lg bg-indigo-50 border-indigo-500' : ''}`}
          style={{
            transform: snapshot.isDragging ? 'rotate(2deg)' : 'rotate(0)',
            transition: 'transform 0.2s'
          }}
        >
          <div className="task-card-title font-semibold text-slate-800 mb-2 flex items-center">
            <span className="truncate">{task.title}</span>
            {(task as any).priority && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getPriorityBadgeColor(task)}`}>
                {(task as any).priority}
              </span>
            )}
          </div>
          
          {task.description && (
            <div className="task-card-description text-sm text-slate-600 mb-3 line-clamp-2 bg-slate-50 p-2 rounded-md border border-slate-100">
              {task.description}
            </div>
          )}
          
          {task.assignees && task.assignees.length > 0 && (
            <div className="task-card-assignees flex flex-wrap mt-3 justify-between items-center border-t border-slate-100 pt-2">
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((assignee) => (
                  <div 
                    key={assignee.id} 
                    className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs text-white font-medium overflow-hidden border border-white shadow-sm"
                    title={assignee.username}
                  >
                    {assignee.username.charAt(0).toUpperCase()}
                  </div>
                ))}
                
                {task.assignees.length > 3 && (
                  <div className="h-7 w-7 rounded-full bg-slate-400 flex items-center justify-center text-xs text-white font-medium border border-white shadow-sm">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
              
              {/* Индикатор дедлайна или статуса */}
              {(task as any).due_date && (
                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                  <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date((task as any).due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
