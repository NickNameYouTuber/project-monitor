import React, { useEffect, useState } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { ArrowLeft, Plus, Search, Filter, Settings, Edit, Trash2, GripVertical, X, Video } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { TaskCard } from './task-card';
import { TaskDetailSidebar } from './task-detail-sidebar';
import { CreateTaskDialog } from './create-task-dialog';
import { EditTaskDialog } from './edit-task-dialog';
import { EditColumnDialog } from './edit-column-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { LoadingSpinner } from './loading-spinner';
import { useNavigate } from 'react-router-dom';
import { ActiveCallIndicator } from './active-call-indicator';
import type { Project, Task, Column } from '../App';
import { websocketService } from '../services/websocketService';

/**
 * ЗАГЛУШКА: Система уведомлений о задачах
 * 
 * В будущем здесь будет реализовано:
 * 1. import { useNotifications } from '../hooks/useNotifications';
 * 2. const { showToast, addNotification } = useNotifications();
 * 3. При назначении задачи:
 *    - showToast('Задача назначена', `Задача "${task.title}" назначена пользователю`, 'success');
 *    - addNotification({
 *        type: 'task',
 *        title: 'Новая задача',
 *        message: `Вам назначена задача: ${task.title}`,
 *        actionUrl: `/projects/${project.id}/tasks`,
 *        metadata: { taskId: task.id, projectId: project.id }
 *      });
 */

interface ProjectTasksPageProps {
  project: Project | null;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  columns: Column[];
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
  assigneeSuggestions: string[];
  branchSuggestions: string[];
  onBack: () => void;
}

interface ColumnProps {
  column: Column;
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: string) => void;
  onTaskClick: (task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (dragIndex: number, hoverIndex: number) => void;
  index: number;
  highlightedTaskId?: string | null;
}

function Column({
  column,
  tasks,
  onTaskMove,
  onTaskClick,
  onTaskEdit,
  onEditColumn,
  onDeleteColumn,
  onMoveColumn,
  index,
  highlightedTaskId
}: ColumnProps) {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'column',
    item: { index, type: 'column' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: ['task', 'column'],
    drop: (item: any) => {
      if (item.type === 'task') {
        onTaskMove(item.id, column.id);
      } else if (item.type === 'column' && item.index !== index) {
        onMoveColumn(item.index, index);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const columnTasks = tasks.filter(task => task.status === column.id);

  return (
    <div
      ref={(node) => {
        dragRef(node);
        dropRef(node);
      }}
      className={`flex-1 min-w-80 bg-card rounded-lg border border-border p-4 ${isOver ? 'bg-accent/50' : ''
        } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 cursor-move">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <div className={`w-3 h-3 rounded-full ${column.color}`} />
          <h3 className="font-medium">{column.title}</h3>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {columnTasks.length}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onEditColumn(column)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Column
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteColumn(column.id)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {columnTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onEdit={(e) => {
              e.stopPropagation();
              onTaskEdit(task);
            }}
            highlighted={task.id === highlightedTaskId}
          />
        ))}
      </div>
    </div>
  );
}

export function ProjectTasksPage({
  project,
  tasks,
  setTasks,
  columns,
  setColumns,
  assigneeSuggestions,
  branchSuggestions,
  onBack
}: ProjectTasksPageProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    assignee: '',
    priority: '',
    status: '',
    hasBranch: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    );
  }

  const loadedProjectRef = React.useRef<string | null>(null);

  useEffect(() => {
    const currentProjectId = project.id;

    // Если данные для этого проекта уже загружены, не делаем повторный запрос
    if (loadedProjectRef.current === currentProjectId) {
      console.log(`Data already loaded for project ${currentProjectId}, skipping`);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    console.log(`Loading data for project ${currentProjectId}`);
    setIsLoading(true);

    (async () => {
      try {
        const { listTaskColumns } = await import('../api/task-columns');
        const { listTasks } = await import('../api/tasks');
        const [cols, tks] = await Promise.all([
          listTaskColumns(currentProjectId),
          listTasks(currentProjectId),
        ]);
        if (isCancelled) return;

        console.log(`Loaded ${cols.length} columns and ${tks.length} tasks for project ${currentProjectId}`);

        // load saved colors for columns
        let colorMap: Record<string, string> = {};
        try { colorMap = JSON.parse(localStorage.getItem('columnColors') || '{}'); } catch { }
        // map columns
        setColumns(cols.map((c) => ({ id: c.id, title: c.name, color: colorMap[c.id] || 'bg-gray-500', order: c.orderIndex })));
        // map tasks
        const mapDtoToTask = (t: any): Task => ({
          id: t.id,
          projectId: t.projectId,
          title: t.title,
          description: t.description || '',
          status: t.columnId,
          priority: 'medium',
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
          repository_id: t.repository_id,
          repositoryBranch: t.repository_branch,
          repositoryInfo: t.repository_info ? {
            repositoryId: t.repository_info.repository_id,
            repositoryName: t.repository_info.repository_name,
            branch: t.repository_info.branch
          } : undefined,
        });

        setTasks(tks.map(mapDtoToTask));

        // Подписка на события в реальном времени
        websocketService.connectRealtime(undefined, currentProjectId, {
          onTaskCreated: (taskData: any) => {
            console.log('Realtime: task created', taskData);
            if (taskData.projectId === currentProjectId) {
              setTasks(prev => {
                if (prev.some(t => t.id === taskData.id)) {
                  return prev;
                }
                return [...prev, mapDtoToTask(taskData)];
              });
            }
          },
          onTaskUpdated: (taskData: any) => {
            console.log('Realtime: task updated', taskData);
            if (taskData.projectId === currentProjectId) {
              setTasks(prev => prev.map(t =>
                t.id === taskData.id ? mapDtoToTask(taskData) : t
              ));
            }
          },
          onTaskDeleted: (data: any) => {
            console.log('Realtime: task deleted', data);
            if (data.projectId === currentProjectId) {
              setTasks(prev => prev.filter(t => t.id !== data.id));
            }
          },
          onColumnCreated: (columnData: any) => {
            console.log('Realtime: column created', columnData);
            if (columnData.projectId === currentProjectId) {
              setColumns(prev => {
                if (prev.some(c => c.id === columnData.id)) return prev;
                return [...prev, {
                  id: columnData.id,
                  title: columnData.name,
                  color: columnData.color || 'bg-gray-500',
                  order: columnData.orderIndex
                }];
              });
            }
          },
          onColumnUpdated: (columnData: any) => {
            console.log('Realtime: column updated', columnData);
            if (columnData.projectId === currentProjectId) {
              setColumns(prev => prev.map(c =>
                c.id === columnData.id ? {
                  ...c,
                  title: columnData.name,
                  color: columnData.color || c.color,
                  order: columnData.orderIndex
                } : c
              ));
            }
          },
          onColumnDeleted: (data: any) => {
            console.log('Realtime: column deleted', data);
            if (data.projectId === currentProjectId) {
              setColumns(prev => prev.filter(c => c.id !== data.id));
            }
          },
        });

        loadedProjectRef.current = currentProjectId;

        return () => {
          websocketService.disconnectRealtime();
        };
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      console.log(`Cleanup for project ${currentProjectId}`);
      isCancelled = true;
      websocketService.disconnectRealtime();
    };
  }, [project.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('highlightTask');
    if (taskId) {
      setHighlightedTaskId(taskId);

      setTimeout(() => {
        const element = document.getElementById(`task-${taskId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setTimeout(() => {
          setHighlightedTaskId(null);
        }, 3000);
      }, 300);
    }
  }, []);

  if (isLoading) {
    return <LoadingSpinner
      stages={['Fetch Tasks', 'Parse Columns', 'Sync Data', 'Ready']}
    />;
  }

  const projectTasks = tasks.filter(task => task.projectId === project.id);

  // Apply filters
  let filteredTasks = projectTasks.filter(task => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Assignee filter
    const matchesAssignee = !filters.assignee || filters.assignee === 'all-assignees' || task.assignee === filters.assignee;

    // Priority filter
    const matchesPriority = !filters.priority || filters.priority === 'all-priorities' || task.priority === filters.priority;

    // Status filter
    const matchesStatus = !filters.status || filters.status === 'all-statuses' || task.status === filters.status;

    // Branch filter
    const matchesBranch = !filters.hasBranch || !!task.repositoryBranch;

    return matchesSearch && matchesAssignee && matchesPriority && matchesStatus && matchesBranch;
  });

  const clearFilters = () => {
    setFilters({
      assignee: '',
      priority: '',
      status: '',
      hasBranch: false
    });
  };

  const hasActiveFilters = (filters.assignee && filters.assignee !== 'all-assignees') ||
    (filters.priority && filters.priority !== 'all-priorities') ||
    (filters.status && filters.status !== 'all-statuses') ||
    filters.hasBranch;

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const handleTaskMove = async (taskId: string, newStatus: string) => {
    const originalTasks = tasks;

    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ));

    try {
      const { moveTask } = await import('../api/tasks');
      await moveTask(project.id, taskId, { column_id: newStatus });
    } catch (error) {
      console.error('Failed to move task:', error);
      setTasks(originalTasks);
    }
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'projectId'>) => {
    try {
      const { createTask } = await import('../api/tasks');
      const created = await createTask(project.id, {
        title: taskData.title,
        description: taskData.description,
        column_id: taskData.status,
        repository_id: taskData.repository_id,
        repository_branch: taskData.repositoryBranch,
      });
      const mapped: Task = {
        id: created.id,
        projectId: created.projectId,
        title: created.title,
        description: created.description || '',
        status: created.columnId,
        priority: taskData.priority,
        createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        dueDate: created.dueDate ? new Date(created.dueDate) : undefined,
        repository_id: created.repository_id,
        repositoryBranch: created.repository_branch,
        repositoryInfo: created.repository_info ? {
          repositoryId: created.repository_info.repository_id,
          repositoryName: created.repository_info.repository_name,
          branch: created.repository_info.branch
        } : undefined,
      };
      setTasks(prev => [...prev, mapped]);
    } catch { }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(task =>
      task.id === updatedTask.id ? updatedTask : task
    ));
    setEditingTask(null);
  };

  const handleEditColumn = (column: Column) => {
    setEditingColumn(column);
  };

  const handleUpdateColumn = async (updatedColumn: Column) => {
    setColumns(prev => prev.map(column =>
      column.id === updatedColumn.id ? updatedColumn : column
    ));
    // persist name to backend
    try {
      const { updateTaskColumn } = await import('../api/task-columns');
      await updateTaskColumn(project.id, updatedColumn.id, { name: updatedColumn.title });
    } catch { }
    // persist color locally
    try {
      const map = JSON.parse(localStorage.getItem('columnColors') || '{}');
      map[updatedColumn.id] = updatedColumn.color;
      localStorage.setItem('columnColors', JSON.stringify(map));
    } catch { }
    setEditingColumn(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (columns.length <= 1) {
      alert('Cannot delete the last column');
      return;
    }

    // Move tasks from deleted column to first column
    const firstColumnId = columns.find(col => col.id !== columnId)?.id;
    if (firstColumnId) {
      setTasks(prev => prev.map(task =>
        task.status === columnId ? { ...task, status: firstColumnId } : task
      ));
    }

    setColumns(prev => prev.filter(column => column.id !== columnId));
  };

  const handleCreateColumn = async (columnData: Omit<Column, 'id' | 'order'>) => {
    try {
      const { createTaskColumn } = await import('../api/task-columns');
      const created = await createTaskColumn(project.id, { name: columnData.title, orderIndex: columns.length });
      const newColumn: Column = {
        ...columnData,
        id: created.id,
        order: created.orderIndex,
      };
      setColumns(prev => [...prev, newColumn]);
      // save color locally
      try {
        const map = JSON.parse(localStorage.getItem('columnColors') || '{}');
        map[newColumn.id] = newColumn.color;
        localStorage.setItem('columnColors', JSON.stringify(map));
      } catch { }
    } catch { }
    setIsCreateColumnOpen(false);
  };

  const handleMoveColumn = (dragIndex: number, hoverIndex: number) => {
    const draggedColumn = sortedColumns[dragIndex];
    const newColumns = [...sortedColumns];
    newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, draggedColumn);

    // Update order for all columns
    const updatedColumns = newColumns.map((column, index) => ({
      ...column,
      order: index
    }));

    setColumns(updatedColumns);
    // Persist reorder
    (async () => {
      try {
        const { reorderTaskColumns } = await import('../api/task-columns');
        await reorderTaskColumns(project.id, updatedColumns.map(c => c.id));
      } catch { }
    })();
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner stages={['Loading project...']} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1">
            <h1>{project.title}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              const roomId = `project-${project.id}-${Date.now()}`;
              try {
                // Создаем звонок в БД
                const { createCall } = await import('../api/calls');
                await createCall({
                  room_id: roomId,
                  title: `Звонок: ${project.title}`,
                  description: `Звонок по проекту ${project.title}`,
                  project_id: project.id,
                });
              } catch (error) {
                console.error('Ошибка создания звонка:', error);
              }
              // Переходим на страницу звонка
              navigate(`/call/${roomId}`);
            }}
          >
            <Video className="w-4 h-4 mr-2" />
            Start Call
          </Button>
        </div>

        {/* Индикатор активных звонков */}
        <ActiveCallIndicator projectId={project.id} className="mb-4" />

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {Object.values(filters).filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter Tasks</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Assignee</Label>
                    <Select
                      value={filters.assignee}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All assignees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-assignees">All assignees</SelectItem>
                        {assigneeSuggestions.map(assignee => (
                          <SelectItem key={assignee} value={assignee}>
                            {assignee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={filters.priority}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-priorities">All priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-statuses">All statuses</SelectItem>
                        {columns.map(column => (
                          <SelectItem key={column.id} value={column.id}>
                            {column.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has-branch"
                      checked={filters.hasBranch}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasBranch: checked }))}
                    />
                    <Label htmlFor="has-branch">Has repository branch</Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Dialog open={isCreateColumnOpen} onOpenChange={setIsCreateColumnOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Column</DialogTitle>
                <DialogDescription>
                  Create a new column for your task board.
                </DialogDescription>
              </DialogHeader>
              <EditColumnDialog
                column={null}
                onSave={handleCreateColumn}
                onCancel={() => setIsCreateColumnOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <Badge variant="secondary">
            Total Tasks: {projectTasks.length}
          </Badge>
          <Badge variant="secondary">
            Completed: {projectTasks.filter(t => t.status === 'done').length}
          </Badge>
          <Badge variant="secondary">
            In Progress: {projectTasks.filter(t => t.status === 'in-progress').length}
          </Badge>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex gap-6 items-stretch">
          {sortedColumns.map((column, index) => (
            <Column
              key={column.id}
              column={column}
              tasks={filteredTasks}
              onTaskMove={handleTaskMove}
              onTaskClick={setSelectedTask}
              onTaskEdit={setEditingTask}
              onEditColumn={handleEditColumn}
              onDeleteColumn={handleDeleteColumn}
              onMoveColumn={handleMoveColumn}
              index={index}
              highlightedTaskId={highlightedTaskId}
            />
          ))}
        </div>
      </div>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateTask={handleCreateTask}
        availableStatuses={columns.map(col => ({ id: col.id, title: col.title }))}
        assigneeSuggestions={assigneeSuggestions}
        branchSuggestions={branchSuggestions}
        projectId={project.id}
      />

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onUpdateTask={handleUpdateTask}
          availableStatuses={columns.map(col => ({ id: col.id, title: col.title }))}
          assigneeSuggestions={assigneeSuggestions}
          branchSuggestions={branchSuggestions}
        />
      )}

      {editingColumn && (
        <EditColumnDialog
          column={editingColumn}
          open={!!editingColumn}
          onOpenChange={(open) => !open && setEditingColumn(null)}
          onSave={handleUpdateColumn}
          onCancel={() => setEditingColumn(null)}
        />
      )}

      {selectedTask && (
        <TaskDetailSidebar
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          projectId={project?.id}
        />
      )}
    </div>
  );
}