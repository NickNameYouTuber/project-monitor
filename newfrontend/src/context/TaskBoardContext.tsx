import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Task } from '../api/tasks';
import { createTask, fetchProjectTasks, moveTask, reorderTasks, updateTask, deleteTask } from '../api/tasks';
import type { TaskColumn } from '../api/taskColumns';
import { createTaskColumn, deleteTaskColumn, fetchProjectColumns, reorderTaskColumns, updateTaskColumn } from '../api/taskColumns';

interface TaskBoardContextValue {
  projectId: string;
  columns: TaskColumn[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  refresh: () => Promise<void>;
  addColumn: (name: string) => Promise<void>;
  updateColumnName: (columnId: string, name: string) => Promise<void>;
  removeColumn: (columnId: string) => Promise<void>;
  reorderColumns: (orderedColumnIds: string[]) => Promise<void>;
  addTask: (columnId: string, title: string, description?: string) => Promise<void>;
  updateTask: (taskId: string, data: Partial<Pick<Task, 'title' | 'description'>>) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, order: number) => Promise<void>;
  reorderTasksInColumn: (columnId: string, orderedTaskIds: string[]) => Promise<void>;
}

const TaskBoardContext = createContext<TaskBoardContextValue | undefined>(undefined);

export function useTaskBoard() {
  const ctx = useContext(TaskBoardContext);
  if (!ctx) throw new Error('useTaskBoard must be used within TaskBoardProvider');
  return ctx;
}

export function TaskBoardProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasksState, setTasksState] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [cols, t] = await Promise.all([
        fetchProjectColumns(projectId),
        fetchProjectTasks(projectId),
      ]);
      setColumns(cols);
      setTasksState(t);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load task board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) refresh();
  }, [projectId]);

  const value = useMemo<TaskBoardContextValue>(() => ({
    projectId,
    columns,
    tasks: tasksState,
    loading,
    error,
    selectedTask,
    setSelectedTask,
    refresh,
    addColumn: async (name: string) => {
      const created = await createTaskColumn({ name, project_id: projectId });
      setColumns((prev) => [...prev, created]);
    },
    updateColumnName: async (columnId: string, name: string) => {
      const updated = await updateTaskColumn(columnId, { name });
      setColumns((prev) => prev.map((c) => (c.id === columnId ? updated : c)));
    },
    removeColumn: async (columnId: string) => {
      await deleteTaskColumn(columnId);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setTasksState((prev) => prev.filter((t) => t.column_id !== columnId));
    },
    reorderColumns: async (orderedColumnIds: string[]) => {
      const updated = await reorderTaskColumns(projectId, orderedColumnIds);
      setColumns(updated);
    },
    addTask: async (columnId: string, title: string, description?: string) => {
      const order = tasksState.filter((t) => t.column_id === columnId).length;
      const created = await createTask({ title, description, column_id: columnId, project_id: projectId, order });
      setTasksState((prev) => [...prev, created]);
    },
    updateTask: async (taskId: string, data) => {
      const cleaned = { ...data } as any;
      if (cleaned.description === null) delete cleaned.description;
      const updated = await updateTask(taskId, cleaned);
      setTasksState((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    },
    removeTask: async (taskId: string) => {
      await deleteTask(taskId);
      setTasksState((prev) => prev.filter((t) => t.id !== taskId));
    },
    moveTask: async (taskId: string, toColumnId: string, order: number) => {
      const updated = await moveTask(taskId, { column_id: toColumnId, order });
      setTasksState((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    },
    reorderTasksInColumn: async (columnId: string, orderedTaskIds: string[]) => {
      const updated = await reorderTasks(columnId, orderedTaskIds);
      setTasksState((prev) => {
        const others = prev.filter((t) => t.column_id !== columnId);
        return [...others, ...updated];
      });
    },
  }), [projectId, columns, tasksState, loading, error, selectedTask]);

  return <TaskBoardContext.Provider value={value}>{children}</TaskBoardContext.Provider>;
}


