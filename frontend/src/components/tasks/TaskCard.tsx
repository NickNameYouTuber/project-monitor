import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Task } from '../../utils/api/tasks';
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
          className={`task-card p-3 mb-2 bg-white rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow
                    ${snapshot.isDragging ? 'shadow-md bg-blue-50' : ''}`}
        >
          <div className="task-card-title font-medium text-gray-800 mb-2">
            {task.title}
          </div>
          
          {task.description && (
            <div className="task-card-description text-sm text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </div>
          )}
          
          {task.assignees && task.assignees.length > 0 && (
            <div className="task-card-assignees flex flex-wrap mt-2">
              {task.assignees.slice(0, 3).map((assignee) => (
                <div 
                  key={assignee.id} 
                  className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs overflow-hidden mr-1 mb-1"
                  title={assignee.username}
                >
                  {assignee.username.charAt(0).toUpperCase()}
                </div>
              ))}
              
              {task.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
