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
  
  // Подготавливаем список исполнителей и сортируем его
  // так, чтобы текущий пользователь был первым
  const assigneeData = useMemo(() => {
    if (!task.assignees || task.assignees.length === 0) {
      return { assignees: [], isCurrentUserAssigned: false, hiddenAssignees: [] };
    }
    
    // Проверяем, является ли текущий пользователь исполнителем
    const currentUserIndex = currentUser ? task.assignees.findIndex(assignee => assignee.id === currentUser.id) : -1;
    const isCurrentUserAssigned = currentUserIndex !== -1;
    
    // Сортируем список так, чтобы текущий пользователь был первым
    let sortedAssignees = [...task.assignees];
    if (isCurrentUserAssigned && currentUserIndex > 0) {
      // Извлекаем текущего пользователя
      const currentUserAssignee = sortedAssignees[currentUserIndex];
      // Удаляем его из текущей позиции
      sortedAssignees.splice(currentUserIndex, 1);
      // Добавляем в начало списка
      sortedAssignees.unshift(currentUserAssignee);
    }
    
    // Приготовим список скрытых исполнителей
    const hiddenAssignees = sortedAssignees.slice(2);
    
    return { 
      assignees: sortedAssignees,
      isCurrentUserAssigned,
      hiddenAssignees
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
          
          <div className="task-card-footer flex items-center mt-3 text-xs overflow-hidden">
            {/* Отображаем список исполнителей и дату в одной строке */}
            <div className="flex items-center flex-wrap gap-1 overflow-hidden flex-grow pr-2">
              {assigneeData.assignees.length > 0 && (
                <>
                  {/* Отображаем первых 2 исполнителей в капсулах */}
                  {assigneeData.assignees.slice(0, 2).map((assignee) => {
                    // Определяем, является ли пользователь текущим
                    const isCurrentUser = currentUser && assignee.id === currentUser.id;
                    
                    return (
                      <div 
                        key={assignee.id}
                        className={`px-2 py-0.5 rounded-full text-xs ${isCurrentUser 
                          ? 'border border-state-success text-state-success' 
                          : 'bg-bg-secondary text-text-secondary'}`}
                        title={assignee.username}
                      >
                        {assignee.username}
                      </div>
                    );
                  })}
                  
                  {/* Показываем индикатор +N тоже в виде капсулы */}
                  {assigneeData.hiddenAssignees.length > 0 && (
                    <div 
                      className="px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted text-xs"
                      title={
                        // Добавляем к подсказке список имен скрытых пользователей
                        `Также назначены: ${assigneeData.hiddenAssignees.map(a => a.username).join(', ')}`
                      }
                    >
                      +{assigneeData.hiddenAssignees.length}
                    </div>
                  )}
                </>
              )}
              {assigneeData.assignees.length === 0 && (
                <span className="text-text-muted">Нет исполнителей</span>
              )}
            </div>
            
            {/* Отображаем дату */}
            <span className="text-text-muted whitespace-nowrap ml-auto">
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
