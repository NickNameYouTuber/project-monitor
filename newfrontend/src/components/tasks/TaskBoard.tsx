import { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult, DroppableProvided } from '@hello-pangea/dnd';
import { useTaskBoard } from '../../context/TaskBoardContext';
import TaskColumn from './TaskColumn';
import TaskColumnForm from './TaskColumnForm';

export default function TaskBoard() {
  const {
    columns,
    tasks,
    reorderTasksInColumn,
    moveTask,
    reorderColumns,
    loading,
  } = useTaskBoard();

  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    if (type === 'column') {
      const newColumnOrder = Array.from(columns.map((c) => c.id));
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);
      await reorderColumns(newColumnOrder);
      return;
    }

    // moving task
    if (source.droppableId === destination.droppableId) {
      const ordered = tasks
        .filter((t) => t.column_id === source.droppableId)
        .sort((a, b) => a.order - b.order)
        .map((t) => t.id);
      const [removed] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, removed);
      await reorderTasksInColumn(source.droppableId, ordered);
    } else {
      await moveTask(draggableId, destination.droppableId, destination.index);
    }
  };

  if (loading) {
    return <div className="p-4">Загрузка...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Доска задач</h2>
        <button onClick={() => setIsAddingColumn(true)} className="px-3 py-2 bg-blue-600 text-white rounded">
          Добавить колонку
        </button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(provided: DroppableProvided) => (
            <div className="flex gap-3 overflow-x-auto pb-4" ref={provided.innerRef} {...provided.droppableProps}>
              {columns
                .sort((a, b) => a.order - b.order)
                .map((column, index) => (
                  <TaskColumn
                    key={column.id}
                    column={column}
                    tasks={tasks.filter((t) => t.column_id === column.id).sort((a, b) => a.order - b.order)}
                    index={index}
                  />
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {isAddingColumn && <TaskColumnForm onClose={() => setIsAddingColumn(false)} />}
    </div>
  );
}


