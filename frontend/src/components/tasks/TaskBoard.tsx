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
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md my-4" role="alert">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">Error: </span>
          <span className="ml-1">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="task-board flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100 p-5 rounded-lg shadow-sm">
      <div className="task-board-header flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800">Task Board</h2>
        <button 
          onClick={() => setIsAddingColumn(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Column
        </button>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(provided: DroppableProvided) => (
            <div 
              className="task-board-content flex overflow-x-auto pb-4 h-full space-x-4 px-1"
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{ minHeight: '70vh' }}
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
