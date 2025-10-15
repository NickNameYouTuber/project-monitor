import React, { useEffect, useState } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { Plus, Search, Filter, Settings, Edit, Trash2, GripVertical, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ProjectCard } from './project-card';
import { CreateProjectDialog } from './create-project-dialog';
import { EditProjectDialog } from './edit-project-dialog';
import { EditColumnDialog } from './edit-column-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { LoadingSpinner } from './loading-spinner';
import type { Project, Column } from '../App';

interface ProjectsPageProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  columns: Column[];
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
  onProjectSelect: (project: Project) => void;
}

interface ColumnProps {
  column: Column;
  projects: Project[];
  onProjectMove: (projectId: string, newStatus: string) => void;
  onProjectSelect: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (dragIndex: number, hoverIndex: number) => void;
  index: number;
}

function Column({ 
  column, 
  projects, 
  onProjectMove, 
  onProjectSelect, 
  onProjectEdit, 
  onEditColumn, 
  onDeleteColumn,
  onMoveColumn,
  index
}: ColumnProps) {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'column',
    item: { index, type: 'column' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: ['project', 'column'],
    drop: (item: any) => {
      if (item.type === 'project') {
        onProjectMove(item.id, column.id);
      } else if (item.type === 'column' && item.index !== index) {
        onMoveColumn(item.index, index);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const columnProjects = projects.filter(project => project.status === column.id);

  return (
    <div
      ref={(node) => {
        dragRef(node);
        dropRef(node);
      }}
      className={`flex-1 min-w-80 bg-card rounded-lg border border-border p-4 ${
        isOver ? 'bg-accent/50' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 cursor-move">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <div className={`w-3 h-3 rounded-full ${column.color}`} />
          <h3 className="font-medium">{column.title}</h3>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {columnProjects.length}
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
        {columnProjects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onClick={() => onProjectSelect(project)}
            onEdit={(e) => {
              e.stopPropagation();
              onProjectEdit(project);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProjectsPage({ projects, setProjects, columns, setColumns, onProjectSelect }: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { listProjects } = await import('../api/projects');
        const currentOrgId = localStorage.getItem('currentOrgId');
        if (!currentOrgId) {
          setProjects([]);
          setIsLoading(false);
          return;
        }
        const data = await listProjects(currentOrgId);
        // map DTO -> UI Project
        const mapped: Project[] = data.map(d => ({
          id: d.id,
          title: d.name,
          description: d.description || '',
          status: d.status || 'inPlans',
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          color: d.color || (() => {
            try {
              const local = JSON.parse(localStorage.getItem('projectColors') || '{}');
              return local[d.id] || '#6366f1';
            } catch { return '#6366f1'; }
          })(),
        }));
        setProjects(mapped);

        // миграция локальных цветов на сервер
        try {
          const local: Record<string, string> = JSON.parse(localStorage.getItem('projectColors') || '{}');
          const updates = mapped
            .filter(p => local[p.id] && local[p.id] !== (data.find(d => d.id === p.id)?.color || ''))
            .map(async (p) => {
              const { updateProject } = await import('../api/projects');
              await updateProject(p.id, { color: local[p.id] });
            });
          await Promise.all(updates);
        } catch {}
      } catch {}
      finally {
        setIsLoading(false);
      }
    })();
  }, [setProjects]);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  if (isLoading) {
    return <LoadingSpinner 
      stages={['Fetch Projects', 'Parse Data', 'Migrate Colors', 'Ready']}
    />;
  }

  const handleProjectMove = (projectId: string, newStatus: string) => {
    setProjects(prev => prev.map(project =>
      project.id === projectId ? { ...project, status: newStatus } : project
    ));
    (async () => {
      try {
        const { updateProjectStatus } = await import('../api/projects');
        await updateProjectStatus(projectId, newStatus);
      } catch {}
    })();
  };

  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      const currentOrgId = localStorage.getItem('currentOrgId');
      if (!currentOrgId) {
        console.error('No organization selected');
        return;
      }
      
      const { createProject } = await import('../api/projects');
      const created = await createProject({
        name: projectData.title,
        description: projectData.description,
        status: projectData.status,
        color: projectData.color,
        organizationId: currentOrgId,
      });
      const mapped: Project = {
        id: created.id,
        title: created.name,
        description: created.description || '',
        status: created.status || 'inPlans',
        createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        color: created.color || projectData.color,
      };
      setProjects(prev => [...prev, mapped]);
      // сохранить цвет локально
      try {
        const map = JSON.parse(localStorage.getItem('projectColors') || '{}');
        map[mapped.id] = mapped.color;
        localStorage.setItem('projectColors', JSON.stringify(map));
      } catch {}
    } catch {}
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(project =>
      project.id === updatedProject.id ? updatedProject : project
    ));
    setEditingProject(null);
    (async () => {
      try {
        const { updateProject } = await import('../api/projects');
        await updateProject(updatedProject.id, {
          name: updatedProject.title,
          description: updatedProject.description,
          status: updatedProject.status,
          color: updatedProject.color,
        });
      } catch {}
    })();
    // sync local color
    try {
      const map = JSON.parse(localStorage.getItem('projectColors') || '{}');
      map[updatedProject.id] = updatedProject.color;
      localStorage.setItem('projectColors', JSON.stringify(map));
    } catch {}
  };

  const handleEditColumn = (column: Column) => {
    setEditingColumn(column);
  };

  const handleUpdateColumn = (updatedColumn: Column) => {
    setColumns(prev => prev.map(column =>
      column.id === updatedColumn.id ? updatedColumn : column
    ));
    setEditingColumn(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (columns.length <= 1) {
      alert('Cannot delete the last column');
      return;
    }
    
    // Move projects from deleted column to first column
    const firstColumnId = columns.find(col => col.id !== columnId)?.id;
    if (firstColumnId) {
      setProjects(prev => prev.map(project =>
        project.status === columnId ? { ...project, status: firstColumnId } : project
      ));
    }
    
    setColumns(prev => prev.filter(column => column.id !== columnId));
  };

  const handleCreateColumn = (columnData: Omit<Column, 'id' | 'order'>) => {
    const newColumn: Column = {
      ...columnData,
      id: Date.now().toString(),
      order: columns.length,
    };
    setColumns(prev => [...prev, newColumn]);
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
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Projects</h1>
            <p className="text-muted-foreground">Manage your project portfolio</p>
          </div>
          <div className="flex items-center gap-2">
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
                    Create a new column for your project board.
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
              New Project
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex gap-6 h-full">
          {sortedColumns.map((column, index) => (
            <Column
              key={column.id}
              column={column}
              projects={filteredProjects}
              onProjectMove={handleProjectMove}
              onProjectSelect={onProjectSelect}
              onProjectEdit={setEditingProject}
              onEditColumn={handleEditColumn}
              onDeleteColumn={handleDeleteColumn}
              onMoveColumn={handleMoveColumn}
              index={index}
            />
          ))}
        </div>
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateProject={handleCreateProject}
        availableStatuses={columns.map(col => ({ id: col.id, title: col.title }))}
      />

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          onUpdateProject={handleUpdateProject}
          availableStatuses={columns.map(col => ({ id: col.id, title: col.title }))}
          onNavigateToTasks={() => {
            onProjectSelect(editingProject);
            setEditingProject(null);
          }}
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
    </div>
  );
}