import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { api } from '../utils/api';
import { Task, TaskCreate, TaskUpdate, TaskMove } from '../utils/api/tasks';
import { TaskColumn, TaskColumnCreate, TaskColumnUpdate } from '../utils/api/taskColumns';
import { useAppContext } from '../utils/AppContext';

interface TaskBoardContextType {
  columns: TaskColumn[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
  
  // Методы для колонок
  fetchColumns: (projectId: string) => Promise<void>;
  addColumn: (columnData: TaskColumnCreate) => Promise<TaskColumn | undefined>;
  updateColumn: (columnId: string, updateData: TaskColumnUpdate) => Promise<TaskColumn | undefined>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;
  
  // Методы для задач
  fetchTasks: (projectId: string) => Promise<void>;
  addTask: (taskData: TaskCreate) => Promise<Task | undefined>;
  updateTask: (taskId: string, updateData: TaskUpdate) => Promise<Task | undefined>;
  moveTask: (taskId: string, moveData: TaskMove) => Promise<Task | undefined>;
  deleteTask: (taskId: string) => Promise<void>;
  reorderTasks: (columnId: string, taskIds: string[]) => Promise<void>;
  
  // UI actions
  setSelectedTask: (task: Task | null) => void;
}

const TaskBoardContext = createContext<TaskBoardContextType | null>(null);

export const useTaskBoard = () => {
  const context = useContext(TaskBoardContext);
  if (!context) {
    throw new Error('useTaskBoard must be used within a TaskBoardProvider');
  }
  return context;
};

interface TaskBoardProviderProps {
  children: ReactNode;
  projectId: string;
}

export const TaskBoardProvider: React.FC<TaskBoardProviderProps> = ({ children, projectId }) => {
  const { currentUser } = useAppContext();
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const token = currentUser?.token || '';
  
  // Загрузка данных при инициализации
  useEffect(() => {
    if (projectId && token) {
      fetchColumns(projectId);
      fetchTasks(projectId);
    }
  }, [projectId, token]);
  
  // Методы для колонок
  const fetchColumns = async (projectId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await api.taskColumns.getAll(projectId, token);
      setColumns(data.sort((a: TaskColumn, b: TaskColumn) => a.order - b.order));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load columns');
    } finally {
      setLoading(false);
    }
  };
  
  const addColumn = async (columnData: TaskColumnCreate) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const newColumn = await api.taskColumns.create(columnData, token);
      setColumns(prev => [...prev, newColumn].sort((a, b) => a.order - b.order));
      setError(null);
      return newColumn;
    } catch (err: any) {
      setError(err.message || 'Failed to add column');
    } finally {
      setLoading(false);
    }
  };
  
  const updateColumn = async (columnId: string, updateData: TaskColumnUpdate) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const updatedColumn = await api.taskColumns.update(columnId, updateData, token);
      setColumns(prev => prev.map(col => col.id === columnId ? updatedColumn : col));
      setError(null);
      return updatedColumn;
    } catch (err: any) {
      setError(err.message || 'Failed to update column');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteColumn = async (columnId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await api.taskColumns.delete(columnId, token);
      setColumns(prev => prev.filter(col => col.id !== columnId));
      // Также удаляем задачи из этой колонки
      setTasks(prev => prev.filter(task => task.column_id !== columnId));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete column');
    } finally {
      setLoading(false);
    }
  };
  
  const reorderColumns = async (columnIds: string[]) => {
    if (!token || !projectId) return;
    
    try {
      setLoading(true);
      
      // Оптимистичное обновление UI
      const reorderedColumns = columnIds.map((id, index) => {
        const column = columns.find(c => c.id === id);
        return column ? { ...column, order: index } : null;
      }).filter(Boolean) as TaskColumn[];
      
      setColumns(reorderedColumns);
      
      // API запрос для сохранения изменений
      await api.taskColumns.reorder(projectId, columnIds, token);
      setError(null);
    } catch (err: any) {
      // Если произошла ошибка, нужно откатить состояние
      fetchColumns(projectId); // Запрашиваем актуальное состояние
      setError(err.message || 'Failed to reorder columns');
    } finally {
      setLoading(false);
    }
  };
  
  // Методы для задач
  const fetchTasks = async (projectId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await api.tasks.getByProject(projectId, token);
      setTasks(data.sort((a: Task, b: Task) => a.order - b.order));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };
  
  const addTask = async (taskData: TaskCreate) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const newTask = await api.tasks.create(taskData, token);
      setTasks(prev => [...prev, newTask]);
      setError(null);
      return newTask;
    } catch (err: any) {
      setError(err.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  };
  
  const updateTask = async (taskId: string, updateData: TaskUpdate) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const updatedTask = await api.tasks.update(taskId, updateData, token);
      setTasks(prev => prev.map(task => task.id === taskId ? updatedTask : task));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
      setError(null);
      return updatedTask;
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };
  
  const moveTask = async (taskId: string, moveData: TaskMove) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');
      
      // Оптимистичное обновление UI
      setTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, column_id: moveData.column_id, order: moveData.order } : t)
      );
      
      // API запрос для сохранения изменений
      const updatedTask = await api.tasks.move(taskId, moveData, token);
      setError(null);
      return updatedTask;
    } catch (err: any) {
      // Если произошла ошибка, нужно откатить состояние
      if (projectId) {
        fetchTasks(projectId);
      }
      setError(err.message || 'Failed to move task');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteTask = async (taskId: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      await api.tasks.delete(taskId, token);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  };
  
  const reorderTasks = async (columnId: string, taskIds: string[]) => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Оптимистичное обновление UI
      const reorderedTasks = tasks.map(task => {
        if (task.column_id === columnId) {
          const index = taskIds.indexOf(task.id);
          return index !== -1 ? { ...task, order: index } : task;
        }
        return task;
      });
      
      setTasks(reorderedTasks);
      
      // API запрос для сохранения изменений
      await api.tasks.reorder(columnId, taskIds, token);
      setError(null);
    } catch (err: any) {
      // Если произошла ошибка, нужно откатить состояние
      if (projectId) {
        fetchTasks(projectId);
      }
      setError(err.message || 'Failed to reorder tasks');
    } finally {
      setLoading(false);
    }
  };
  
  const contextValue: TaskBoardContextType = {
    columns,
    tasks,
    loading,
    error,
    selectedTask,
    fetchColumns,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    fetchTasks,
    addTask,
    updateTask,
    moveTask,
    deleteTask,
    reorderTasks,
    setSelectedTask
  };
  
  return (
    <TaskBoardContext.Provider value={contextValue}>
      {children}
    </TaskBoardContext.Provider>
  );
};
