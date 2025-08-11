import { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Button, MultiSelect, TextInput, Select } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';
import TaskColumn from './TaskColumn';
import TaskDetail from './TaskDetail';
import TaskColumnForm from './TaskColumnForm';

const TaskBoard = () => {
  const { columns, tasks, reorderTasks, moveTask, loading, projectId, reorderColumns, selectedTask } = useTaskBoard();
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [query, setQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [reviewerFilter, setReviewerFilter] = useState<string | null>(null);

  const assigneeOptions = Array.from(
    new Map(
      tasks.flatMap((t) => (t as any).assignees || []).map((u: any) => [u.id, { value: u.id, label: u.username }])
    ).values()
  );
  const reviewerOptions = assigneeOptions;

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
        <h2 className="text-xl font-semibold">Доска задач</h2>
        <Button size="xs" onClick={() => setIsAddingColumn(true)}>Добавить колонку</Button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(provided: any) => (
            <div className="flex overflow-x-auto pb-6 h-full" ref={provided.innerRef} {...provided.droppableProps}>
              {columns
                .sort((a, b) => a.order - b.order)
                .map((column, i) => (
                  <TaskColumn
                    key={column.id}
                    column={column}
                    tasks={tasks
                      .filter((t) => t.column_id === column.id)
                      .filter((t) =>
                        (!query || t.title.toLowerCase().includes(query.toLowerCase()) || (t.description || '').toLowerCase().includes(query.toLowerCase())) &&
                        (assigneeFilter.length === 0 || assigneeFilter.every((id) => ((t as any).assignees || []).some((a: any) => a.id === id))) &&
                        (!reviewerFilter || (t as any).reviewer_id === reviewerFilter)
                      )
                      .sort((a, b) => a.order - b.order)}
                    index={i}
                  />
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {/* Без внешней обводки у контейнера */}
      <div className="fixed bottom-4 right-4 bg-white/80 border rounded-md p-2 shadow-sm flex gap-2 items-center">
        <TextInput placeholder="Поиск" value={query} onChange={(e) => setQuery(e.currentTarget.value)} size="xs" />
        <MultiSelect data={assigneeOptions} value={assigneeFilter} onChange={setAssigneeFilter} placeholder="Исполнители" searchable clearable size="xs" nothingFoundMessage="Нет" />
        <Select data={[{ value: '', label: 'Все ревьюеры' }, ...reviewerOptions]} value={reviewerFilter ?? ''} onChange={(v) => setReviewerFilter(v || null)} placeholder="Ревьюер" searchable clearable size="xs" />
      </div>
      {/* Модалка добавления колонки */}
      {projectId && (
        <TaskColumnForm projectId={projectId} opened={isAddingColumn} onClose={() => setIsAddingColumn(false)} />
      )}
      {selectedTask && <TaskDetail />}
    </div>
  );
};

export default TaskBoard;


