import { Draggable } from '@hello-pangea/dnd';
import type { Task } from '../../api/tasks';
import { useTaskBoard } from '../../context/TaskBoardContext';

export default function TaskCard({ task, index }: { task: Task; index: number }) {
  const { removeTask } = useTaskBoard();
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided: any) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white rounded shadow p-2 mb-2"
        >
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="font-medium">{task.title}</div>
              {task.description && <div className="text-sm text-gray-500">{task.description}</div>}
            </div>
            <button className="text-xs text-red-600" onClick={() => removeTask(task.id)}>
              Удалить
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}


