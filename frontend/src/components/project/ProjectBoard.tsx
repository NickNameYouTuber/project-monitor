import React, { useState } from 'react';
import type { Project, ProjectStatus } from '../../types';
import ProjectColumn from './ProjectColumn';
import { useAppContext } from '../../utils/AppContext';

interface ProjectBoardProps {
  projects: Project[];
  onProjectsChange?: (updatedProjects: Project[]) => void;
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects }) => {
  const { moveProject, reorderProjects } = useAppContext();
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.setData('text/plain', project.id.toString());
    
    // Set drag image
    if (e.target instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.target, 20, 20);
    }
  };

  // Handle drag over on a project card
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.currentTarget.classList.contains('project-card')) {
      // Get the drag position (top half or bottom half)
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const isTopHalf = y < rect.height / 2;
      
      // Remove any existing position classes
      e.currentTarget.classList.remove('drag-above', 'drag-below');
      
      // Add the correct position class
      e.currentTarget.classList.add(isTopHalf ? 'drag-above' : 'drag-below');
    }
  };

  // Handle drop on a project card
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId?: string) => {
    e.preventDefault();
    
    if (!draggedProject || !targetId) return;
    
    // Remove drag styling
    if (e.currentTarget.classList.contains('project-card')) {
      e.currentTarget.classList.remove('drag-above', 'drag-below');
      
      // Get the drop position (above or below)
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const isTopHalf = y < rect.height / 2;
      const position = isTopHalf ? 'above' : 'below';
      
      // Reorder the projects
      if (targetId !== draggedProject.id) {
        reorderProjects(draggedProject.id, targetId, position);
      }
    }
    
    setDraggedProject(null);
  };

  // Handle drop on a column
  const handleColumnDrop = (e: React.DragEvent<HTMLDivElement>, status: ProjectStatus) => {
    e.preventDefault();
    
    const projectId = e.dataTransfer.getData('text/plain');
    
    if (projectId && draggedProject && draggedProject.status !== status) {
      moveProject(projectId, status);
    }
    
    setDraggedProject(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <ProjectColumn
        title="In Plans"
        status="inPlans"
        projects={projects}
        colorClass="bg-blue-500"
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onColumnDrop={handleColumnDrop}
      />
      
      <ProjectColumn
        title="In Progress"
        status="inProgress"
        projects={projects}
        colorClass="bg-yellow-500"
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onColumnDrop={handleColumnDrop}
      />
      
      <ProjectColumn
        title="On Pause"
        status="onPause"
        projects={projects}
        colorClass="bg-orange-500"
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onColumnDrop={handleColumnDrop}
      />
      
      <ProjectColumn
        title="Completed"
        status="completed"
        projects={projects}
        colorClass="bg-green-500"
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onColumnDrop={handleColumnDrop}
      />
    </div>
  );
};

export default ProjectBoard;
