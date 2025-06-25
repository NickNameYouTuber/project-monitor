import React from 'react';
import type { Project, ProjectStatus } from '../../types';
import ProjectCard from './ProjectCard';

interface ProjectColumnProps {
  title: string;
  status: ProjectStatus;
  projects: Project[];
  colorClass: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, project: Project) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, projectId?: string) => void;
  onColumnDrop: (e: React.DragEvent<HTMLDivElement>, status: ProjectStatus) => void;
}

const ProjectColumn: React.FC<ProjectColumnProps> = ({
  title,
  status,
  projects,
  colorClass,
  onDragStart,
  onDragOver,
  onDrop,
  onColumnDrop
}) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    onColumnDrop(e, status);
  };

  // Filter and sort projects by order (desc)
  const columnProjects = projects
    .filter(project => project.status === status)
    .sort((a, b) => b.order - a.order);

  return (
    <div className="bg-bg-card rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <div className={`w-3 h-3 ${colorClass} rounded-full mr-3`}></div>
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>
      <div 
        className="space-y-4 min-h-[150px] border-2 border-dashed border-transparent hover:border-border-primary rounded-lg p-3"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-status={status}
      >
        {columnProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectColumn;
