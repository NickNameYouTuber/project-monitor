import React, { useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import type { TaskColumn as TaskColumnType } from '../../utils/api/taskColumns';
import type { Task as TaskType } from '../../utils/api/tasks';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskColumnForm from './TaskColumnForm';
import { useTaskBoard } from '../../context/TaskBoardContext';

interface TaskColumnProps {
  column: TaskColumnType;
  tasks: TaskType[];
}

const TaskColumn: React.FC<TaskColumnProps> = ({ column, tasks }) => {
  const { deleteColumn } = useTaskBoard();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingColumn, setIsEditingColumn] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const handleDeleteColumn = async () => {
    if (window.confirm(`Are you sure you want to delete column "${column.name}"?`)) {
      await deleteColumn(column.id);
    }
  };

  return (
    <Draggable draggableId={column.id} index={column.order}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="task-column bg-gray-100 rounded-lg mr-4 flex-shrink-0 w-72 max-h-full flex flex-col"
        >
          {/* Заголовок колонки */}
          <div 
            className="column-header p-3 flex justify-between items-center bg-gray-200 rounded-t-lg"
            {...provided.dragHandleProps}
          >
            <h3 className="font-medium text-gray-800">{column.name}</h3>
            <div className="column-actions relative">
              <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <i className="fas fa-ellipsis-v"></i>
              </button>

              {/* Выпадающее меню для колонки */}
              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <ul className="py-1">
                    <li>
                      <button
                        onClick={() => {
                          setIsEditingColumn(true);
                          setShowColumnMenu(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Edit Column
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          handleDeleteColumn();
                          setShowColumnMenu(false);
                        }}
                        className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                      >
                        Delete Column
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Список задач */}
          <Droppable droppableId={column.id} type="task">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`tasks-list p-2 flex-grow overflow-y-auto ${
                  snapshot.isDraggingOver ? 'bg-blue-50' : ''
                }`}
                style={{ minHeight: '100px' }}
              >
                {tasks.map((task, index) => (
                  <TaskCard key={task.id} task={task} index={index} />
                ))}
                {provided.placeholder}

                {/* Форма добавления задачи (если активна) */}
                {isAddingTask && (
                  <TaskForm
                    columnId={column.id}
                    projectId={column.project_id}
                    onClose={() => setIsAddingTask(false)}
                    mode="create"
                  />
                )}
              </div>
            )}
          </Droppable>

          {/* Кнопка добавления задачи */}
          <div className="column-footer p-3 border-t border-gray-200">
            <button
              onClick={() => setIsAddingTask(true)}
              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded flex items-center"
            >
              <i className="fas fa-plus mr-2"></i> Add a Task
            </button>
          </div>

          {/* Форма редактирования колонки */}
          {isEditingColumn && (
            <TaskColumnForm
              column={column}
              onClose={() => setIsEditingColumn(false)}
              mode="edit"
            />
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskColumn;
