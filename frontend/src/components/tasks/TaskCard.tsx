import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import type { Task } from '../../utils/api/tasks';
import { useTaskBoard } from '../../context/TaskBoardContext';

interface TaskCardProps {
  task: Task;
  index: number;
}

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
          className={`task-card p-3 mb-3 bg-bg-card rounded-lg border border-border-primary cursor-pointer hover:shadow-md transition-shadow duration-200
                    ${snapshot.isDragging ? 'shadow-lg bg-primary/10' : 'shadow-sm'}`}
        >
          <div className="task-card-title font-medium text-text-primary mb-2">
            {task.title}
          </div>
          
          {task.description && (
            <div className="task-card-description text-sm text-text-secondary mb-3 line-clamp-2">
              {task.description}
            </div>
          )}
          
          {task.assignees && task.assignees.length > 0 && (
            <div className="task-card-assignees flex flex-wrap mt-2">
              {task.assignees.slice(0, 3).map((assignee) => (
                <div 
                  key={assignee.id} 
                  className="h-6 w-6 rounded-full bg-bg-secondary flex items-center justify-center text-xs overflow-hidden mr-1 mb-1 text-text-secondary"
                  title={assignee.username}
                >
                  {assignee.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {task.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
          
          <div className="task-card-footer flex justify-between items-center mt-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {task.assignees.length} assignee{task.assignees.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
