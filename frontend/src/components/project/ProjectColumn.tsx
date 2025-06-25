import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import type { Project, ProjectStatus } from '../../types';
import ProjectCard from './ProjectCard';

interface ProjectColumnProps {
  title: string;
  status: ProjectStatus;
  projects: Project[];
  colorClass: string;
}

const ProjectColumn: React.FC<ProjectColumnProps> = ({
  title,
  status,
  projects,
  colorClass
}) => {

  // Filter and sort projects by order (desc)
  const columnProjects = projects
    .filter(project => project.status === status)
    .sort((a, b) => b.order - a.order);

  return (
    <div className="project-column bg-bg-card rounded-lg flex-shrink-0 w-full flex flex-col shadow-sm border border-border-primary">
      <div className="column-header p-4 flex justify-between items-center bg-bg-secondary rounded-t-lg border-b border-border-primary">
        <div className="flex items-center">
          <div className={`w-3 h-3 ${colorClass} rounded-full mr-3`}></div>
          <h2 className="font-semibold text-text-primary">{title}</h2>
        </div>
        <span className="text-sm text-text-muted">{projects.filter(p => p.status === status).length}</span>
      </div>
      <Droppable droppableId={status} type="project">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`projects-list p-3 flex-grow overflow-y-auto space-y-4 min-h-[150px] ${
              snapshot.isDraggingOver ? 'bg-primary/10' : ''
            }`}
            style={{ minHeight: '100px' }}
            data-status={status}
          >
            {columnProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default ProjectColumn;
