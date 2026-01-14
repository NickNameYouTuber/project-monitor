import React from 'react';
import { useDrag } from 'react-dnd';
import { Calendar, User, MoreVertical } from 'lucide-react';
import {
  Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@nicorp/nui';
import type { Project } from '../App';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
}

export function ProjectCard({ project, onClick, onEdit }: ProjectCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'project',
    item: { id: project.id, type: 'project' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'backlog': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      ref={drag}
      className={`bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : ''
        }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: project.color }}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onEdit}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-medium mb-2">{project.title}</h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {project.description}
      </p>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className={getStatusColor(project.status)}>
          {project.status.replace('-', ' ')}
        </Badge>
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 mr-1" />
          {project.createdAt.toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}