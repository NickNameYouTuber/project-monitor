import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Task } from '../api/tasks';
import { createTask, deleteTask, getProjectTasks, moveTask as apiMoveTask, reorderColumnTasks, updateTask } from '../api/tasks';
import type { TaskColumn } from '../api/taskColumns';
import { createTaskColumn, deleteTaskColumn, getProjectTaskColumns, reorderTaskColumns, updateTaskColumn } from '../api/taskColumns';

interface TaskBoardContextType {
  projectId: string;
  columns: TaskColumn[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
  fetchColumns: (projectId: string) => Promise<void>;
  addColumn: (columnData: { name: string }) => Promise<TaskColumn | undefined>;
  updateColumn: (columnId: string, updateData: { name?: string; order?: number }) => Promise<TaskColumn | undefined>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (projectId: string, columnIds: string[]) => Promise<void>;
  fetchTasks: (projectId: string) => Promise<void>;
  addTask: (taskData: { title: string; description?: string; column_id: string; assignee_ids?: string[]; reviewer_id?: string | null }) => Promise<Task | undefined>;
  updateTask: (taskId: string, updateData: { title?: string; description?: string; column_id?: string; order?: number; assignee_ids?: string[]; reviewer_id?: string | null; due_date?: string | null; estimate_minutes?: number | null }) => Promise<Task | undefined>;
  moveTask: (taskId: string, moveData: { column_id: string; order: number }) => Promise<Task | undefined>;
  deleteTask: (taskId: string) => Promise<void>;
  reorderTasks: (columnId: string, taskIds: string[]) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
}

const TaskBoardContext = createContext<TaskBoardContextType | null>(null);

export function useTaskBoard() {
  const ctx = useContext(TaskBoardContext);
  if (!ctx) throw new Error('useTaskBoard must be used within TaskBoardProvider');
  return ctx;
}

export function TaskBoardProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchColumns = useCallback(async (pid: string) => {
    try {
      setLoading(true);
      const data = await getProjectTaskColumns(pid);
      setColumns(data.sort((a, b) => a.order - b.order));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load columns');
    } finally {
      setLoading(false);
    }
  }, []);

  const addColumn = useCallback(async (columnData: { name: string }) => {
    try {
      setLoading(true);
      const newColumn = await createTaskColumn(projectId, columnData);
      setColumns((prev) => [...prev, newColumn].sort((a, b) => a.order - b.order));
      setError(null);
      return newColumn;
    } catch (e: any) {
      setError(e?.message || 'Failed to add column');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateColumn = useCallback(async (columnId: string, updateData: { name?: string; order?: number }) => {
    try {
      setLoading(true);
      const updated = await updateTaskColumn(projectId, columnId, updateData);
      setColumns((prev) => prev.map((c) => (c.id === columnId ? updated : c)));
      setError(null);
      return updated;
    } catch (e: any) {
      setError(e?.message || 'Failed to update column');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteColumn = useCallback(async (columnId: string) => {
    try {
      setLoading(true);
      await deleteTaskColumn(projectId, columnId);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setTasks((prev) => prev.filter((t) => t.column_id !== columnId));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete column');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const reorderColumnsFn = useCallback(async (pid: string, columnIds: string[]) => {
    try {
      setLoading(true);
      const reordered = columnIds
        .map((id, index) => {
          const col = columns.find((c) => c.id === id);
          return col ? { ...col, order: index } : null;
        })
        .filter(Boolean) as TaskColumn[];
      setColumns(reordered);
      await reorderTaskColumns(pid, columnIds);
      setError(null);
    } catch (e: any) {
      await fetchColumns(pid);
      setError(e?.message || 'Failed to reorder columns');
    } finally {
      setLoading(false);
    }
  }, [columns, fetchColumns]);

  const fetchTasks = useCallback(async (pid: string) => {
    try {
      setLoading(true);
      const data = await getProjectTasks(pid);
      setTasks(data.sort((a, b) => a.order - b.order));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = useCallback(async (taskData: { title: string; description?: string; column_id: string; assignee_ids?: string[]; reviewer_id?: string | null }) => {
    try {
      setLoading(true);
      const newTask = await createTask(projectId, taskData as any);
      setTasks((prev) => [...prev, newTask]);
      setError(null);
      return newTask;
    } catch (e: any) {
      setError(e?.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateTaskFn = useCallback(async (taskId: string, updateData: { title?: string; description?: string; column_id?: string; order?: number; assignee_ids?: string[]; reviewer_id?: string | null; due_date?: string | null; estimate_minutes?: number | null }) => {
    try {
      setLoading(true);
      const updated = await updateTask(projectId, taskId, updateData);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      if (selectedTask?.id === taskId) setSelectedTask(updated);
      setError(null);
      return updated;
    } catch (e: any) {
      setError(e?.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  }, [selectedTask]);

  const moveTaskFn = useCallback(async (taskId: string, moveData: { column_id: string; order: number }) => {
    try {
      setLoading(true);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column_id: moveData.column_id, order: moveData.order } : t)));
      const updated = await apiMoveTask(projectId, taskId, moveData);
      setError(null);
      return updated;
    } catch (e: any) {
      if (projectId) await fetchTasks(projectId);
      setError(e?.message || 'Failed to move task');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks]);

  const deleteTaskFn = useCallback(async (taskId: string) => {
    try {
      setLoading(true);
      await deleteTask(projectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedTask]);

  const reorderTasks = useCallback(async (columnId: string, taskIds: string[]) => {
    try {
      setLoading(true);
      setTasks((prev) =>
        prev.map((t) => (t.column_id === columnId ? { ...t, order: taskIds.indexOf(t.id) } : t))
      );
      await reorderColumnTasks(projectId, columnId, taskIds);
      setError(null);
    } catch (e: any) {
      if (projectId) await fetchTasks(projectId);
      setError(e?.message || 'Failed to reorder tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks]);

  useEffect(() => {
    if (projectId) {
      fetchColumns(projectId);
      fetchTasks(projectId);
    }
  }, [projectId, fetchColumns, fetchTasks]);

  return (
    <TaskBoardContext.Provider
      value={{
        projectId,
        columns,
        tasks,
        loading,
        error,
        selectedTask,
        fetchColumns,
        addColumn,
        updateColumn,
        deleteColumn,
        reorderColumns: (pid, ids) => reorderColumnsFn(pid, ids),
        fetchTasks,
        addTask,
        updateTask: updateTaskFn,
        moveTask: moveTaskFn,
        deleteTask: deleteTaskFn,
        reorderTasks,
        setSelectedTask,
      }}
    >
      {children}
    </TaskBoardContext.Provider>
  );
}


