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
          className="task-column bg-bg-card rounded-lg mr-4 flex-shrink-0 w-72 max-h-full flex flex-col shadow-sm border border-border-primary"
        >
          {/* Заголовок колонки */}
          <div 
            className="column-header p-4 flex justify-between items-center bg-bg-secondary rounded-t-lg border-b border-border-primary"
            {...provided.dragHandleProps}
          >
            <h3 className="font-semibold text-text-primary">{column.name}</h3>
            <div className="column-actions relative">
              <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="text-text-muted hover:text-text-secondary focus:outline-none p-1 rounded-full bg-bg-secondary transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {/* Выпадающее меню для колонки */}
              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                  <ul className="py-1">
                    <li>
                      <button
                        onClick={() => {
                          setIsEditingColumn(true);
                          setShowColumnMenu(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left transition-colors"
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
                        className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left transition-colors"
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
                className={`tasks-list p-3 flex-grow overflow-y-auto ${
                  snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
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
          <div className="p-3 border-t border-border-primary bg-bg-secondary">
            <button
              onClick={() => setIsAddingTask(true)}
              className="w-full py-2 px-3 text-text-secondary hover:text-text-primary hover:bg-primary/10 rounded-lg text-sm transition-colors duration-200 border-2 border-dashed border-border-primary"
            >
              + Add Task
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
