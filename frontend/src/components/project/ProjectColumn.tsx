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
    <div className="bg-bg-card rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <div className={`w-3 h-3 ${colorClass} rounded-full mr-3`}></div>
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>
      <Droppable droppableId={status} type="project">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-4 min-h-[150px] p-3 rounded-lg ${
              snapshot.isDraggingOver ? 'bg-primary/10 border-2 border-dashed border-primary' : 'border-2 border-dashed border-transparent hover:border-border-primary'
            }`}
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
