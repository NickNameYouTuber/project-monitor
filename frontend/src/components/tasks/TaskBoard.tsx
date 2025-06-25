import { useState } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import type { DropResult, DroppableProvided } from 'react-beautiful-dnd';
import { TaskBoardProvider, useTaskBoard } from '../../context/TaskBoardContext';
import TaskColumn from './TaskColumn';
import TaskDetail from './TaskDetail';
import TaskColumnForm from './TaskColumnForm';

interface TaskBoardProps {
  projectId: string;
}

const TaskBoard = ({ }: TaskBoardProps) => {
  const { 
    columns, 
    tasks, 
    reorderTasks, 
    moveTask, 
    selectedTask, 
    loading,
    reorderColumns,
    error
  } = useTaskBoard();

  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type, draggableId } = result;
    
    // Если нет назначения или перетаскивание вернулось на ту же позицию - ничего не делаем
    if (!destination || 
        (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }
    
    // Если перетаскиваем колонку
    if (type === 'column') {
      const newColumnOrder = Array.from(columns.map(col => col.id));
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);
      
      reorderColumns(newColumnOrder);
      return;
    }
    
    // Если перетаскиваем карточку внутри одной колонки
    if (source.droppableId === destination.droppableId) {
      const columnId = source.droppableId;
      const taskIds = tasks
        .filter(task => task.column_id === columnId)
        .sort((a, b) => a.order - b.order)
        .map(task => task.id);
      
      taskIds.splice(source.index, 1);
      taskIds.splice(destination.index, 0, draggableId);
      
      reorderTasks(columnId, taskIds);
    } 
    // Если перемещаем карточку между колонками
    else {
      const targetColumnTasks = tasks
        .filter(task => task.column_id === destination.droppableId)
        .sort((a, b) => a.order - b.order)
        .map(task => task.id);
      
      // Вставляем задачу на новую позицию
      targetColumnTasks.splice(destination.index, 0, draggableId);
      
      // Перемещаем задачу в новую колонку
      moveTask(draggableId, {
        column_id: destination.droppableId,
        order: destination.index
      });
    }
  };

  if (loading && columns.length === 0) {
    return <div className="flex justify-center items-center h-64 text-text-secondary">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-state-error-light border border-state-error text-state-error px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="task-board flex flex-col h-full bg-bg-primary">
      <div className="task-board-header flex justify-between items-center mb-4 p-4 bg-bg-card border-b border-border-primary">
        <h2 className="text-xl font-semibold text-text-primary">Task Board</h2>
        <button 
          onClick={() => setIsAddingColumn(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          Add Column
        </button>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(provided: DroppableProvided) => (
            <div 
              className="task-board-content flex overflow-x-auto pb-6 h-full bg-gray-50 dark:bg-gray-900"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {columns
                .sort((a, b) => a.order - b.order)
                .map(column => (
                  <TaskColumn 
                    key={column.id} 
                    column={column} 
                    tasks={tasks.filter(task => task.column_id === column.id).sort((a, b) => a.order - b.order)} 
                  />
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Форма добавления колонки */}
      {isAddingColumn && (
        <TaskColumnForm 
          onClose={() => setIsAddingColumn(false)} 
          mode="create" 
        />
      )}
      
      {/* Детали задачи */}
      {selectedTask && (
        <TaskDetail 
          task={selectedTask} 
        />
      )}
    </div>
  );
};

// Обертка для доски задач с провайдером контекста
const TaskBoardWrapper = ({ projectId }: TaskBoardProps) => {
  return (
    <TaskBoardProvider projectId={projectId}>
      <TaskBoard projectId={projectId} />
    </TaskBoardProvider>
  );
};

export default TaskBoardWrapper;
