import React, { useMemo } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import type { Task } from '../../utils/api/tasks';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { useAppContext } from '../../utils/AppContext';

interface TaskCardProps {
  task: Task;
  index: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const { setSelectedTask } = useTaskBoard();
  const { currentUser } = useAppContext();
  
  // Открытие модального окна с деталями задачи
  const handleCardClick = () => {
    setSelectedTask(task);
  };
  
  // Рассчитываем максимальное количество отображаемых исполнителей
  // Делаем метку, является ли пользователь исполнителем задачи
  const assigneeData = useMemo(() => {
    if (!task.assignees || task.assignees.length === 0) {
      return { assignees: [], isCurrentUserAssigned: false };
    }
    
    const isCurrentUserAssigned = task.assignees.some(
      assignee => currentUser && assignee.id === currentUser.id
    );
    
    return { 
      assignees: task.assignees,
      isCurrentUserAssigned 
    };
  }, [task.assignees, currentUser]);
  
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
          
          <div className="task-card-footer flex justify-between items-center mt-3">
            {/* Отображаем список исполнителей */}
            <div className="flex items-center flex-1 overflow-hidden">
              {assigneeData.assignees.length > 0 ? (
                <div className="flex items-center space-x-1 overflow-hidden">
                  {/* Показываем исполнителей по имени */}
                  <div className="flex flex-wrap overflow-hidden whitespace-nowrap text-xs">
                    {assigneeData.assignees.slice(0, 2).map((assignee, index) => (
                      <span 
                        key={assignee.id}
                        className={`mr-1 ${currentUser && assignee.id === currentUser.id ? 'text-state-success font-medium' : 'text-text-secondary'}`}
                        title={assignee.username}
                      >
                        {assignee.username}
                        {index < Math.min(assigneeData.assignees.length, 2) - 1 ? ',' : ''}
                      </span>
                    ))}
                    {assigneeData.assignees.length > 2 && (
                      <span className="text-text-muted" title={`+ ${assigneeData.assignees.length - 2} more assignees`}>
                        +{assigneeData.assignees.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-text-muted">No assignees</span>
              )}
            </div>
            
            {/* Отображаем дату */}
            <span className="text-xs text-text-muted ml-2 whitespace-nowrap">
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
