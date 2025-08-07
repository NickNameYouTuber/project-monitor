import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { Task } from '../../api/tasks';
import type { TaskColumn as TaskColumnType } from '../../api/taskColumns';
import { useTaskBoard } from '../../context/TaskBoardContext';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';

export default function TaskColumn({ column, tasks, index }: { column: TaskColumnType; tasks: Task[]; index: number }) {
  const { removeColumn, addTask } = useTaskBoard();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided: any) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="min-w-[280px]">
          <div className="flex justify-between items-center mb-2" {...provided.dragHandleProps}>
            <h3 className="font-semibold">{column.name}</h3>
            <div className="flex gap-1">
              <button className="text-sm px-2 py-1 bg-gray-200 rounded" onClick={() => setIsAdding(true)}>
                + Задача
              </button>
              <button className="text-sm px-2 py-1 bg-gray-200 rounded" onClick={() => removeColumn(column.id)}>
                Удалить
              </button>
            </div>
          </div>
          <Droppable droppableId={column.id} type="task">
            {(dropProvided: any) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="bg-gray-50 rounded p-2 min-h-[120px]">
                {tasks.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} />
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          {isAdding && (
            <TaskForm
              onClose={() => setIsAdding(false)}
              onSubmit={async (title, description) => {
                await addTask(column.id, title, description);
                setIsAdding(false);
              }}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}


