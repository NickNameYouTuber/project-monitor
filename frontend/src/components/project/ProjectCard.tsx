import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../../types';
import { useAppContext } from '../../utils/AppContext';

interface ProjectCardProps {
  project: Project;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, project: Project) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDragStart, onDragOver, onDrop }) => {
  const { deleteProject } = useAppContext();
  const navigate = useNavigate();
  
  const priorityColors = {
    high: 'bg-state-error-light text-state-error',
    medium: 'bg-state-warning-light text-state-warning',
    low: 'bg-state-success-light text-state-success'
  };

  const assigneeIcon = project.assignee === 'Team' ? 'fas fa-users' : 'fas fa-user';

  return (
    <div
      className="project-card bg-bg-secondary rounded-lg p-4 border border-border-primary cursor-move"
      draggable
      onDragStart={(e) => onDragStart(e, project)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, project.id)}
      data-project-id={project.id}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-text-primary text-lg">{project.name}</h3>
        <div className="flex space-x-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${project.id}/tasks`);
            }} 
            className="p-1.5 rounded bg-bg-secondary text-text-secondary hover:bg-primary/10 hover:text-primary transition"
            title="Open task board"
          >
            <i className="fas fa-tasks text-sm"></i>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if(confirm('Are you sure you want to delete this project?')) {
                deleteProject(project.id);
              }
            }} 
            className="p-1.5 rounded bg-bg-secondary text-text-secondary hover:bg-state-error-light hover:text-state-error transition"
            title="Delete project"
          >
            <i className="fas fa-trash text-sm"></i>
          </button>
        </div>
      </div>
      <p className="text-text-secondary text-sm mb-3">{project.description}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[project.priority]}`}>
            {project.priority.toUpperCase()}
          </span>
          <span className="text-xs text-text-secondary flex items-center">
            <i className={`${assigneeIcon} mr-1`}></i>
            {project.assignee}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
