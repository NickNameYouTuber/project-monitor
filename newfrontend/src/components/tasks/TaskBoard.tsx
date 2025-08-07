import { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';
import TaskColumn from './TaskColumn';
import TaskColumnForm from './TaskColumnForm';

const TaskBoard = () => {
  const { columns, tasks, reorderTasks, moveTask, loading, projectId, reorderColumns } = useTaskBoard();
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const handleDragEnd = (result: any) => {
    const { source, destination, type, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    if (type === 'column') {
      const newColumnOrder = Array.from(columns.map((col) => col.id));
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);
      if (projectId) {
        void reorderColumns(projectId, newColumnOrder);
      }
      return;
    }
    if (source.droppableId === destination.droppableId) {
      const columnId = source.droppableId;
      const taskIds = tasks
        .filter((task) => task.column_id === columnId)
        .sort((a, b) => a.order - b.order)
        .map((task) => task.id);
      taskIds.splice(source.index, 1);
      taskIds.splice(destination.index, 0, draggableId);
      reorderTasks(columnId, taskIds);
    } else {
      moveTask(draggableId, { column_id: destination.droppableId, order: destination.index });
    }
  };

  if (loading && columns.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Task Board</h2>
        <Button size="xs" onClick={() => setIsAddingColumn(true)}>Добавить колонку</Button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(provided: any) => (
            <div className="flex overflow-x-auto pb-6 h-full" ref={provided.innerRef} {...provided.droppableProps}>
              {columns
                .sort((a, b) => a.order - b.order)
                .map((column, i) => (
                  <TaskColumn key={column.id} column={column} tasks={tasks.filter((t) => t.column_id === column.id).sort((a, b) => a.order - b.order)} index={i} />
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {/* Без внешней обводки у контейнера */}
      {/* Модалка добавления колонки */}
      {projectId && (
        <TaskColumnForm projectId={projectId} opened={isAddingColumn} onClose={() => setIsAddingColumn(false)} />
      )}
    </div>
  );
};

export default TaskBoard;


