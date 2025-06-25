import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Draggable } from 'react-beautiful-dnd';
import type { Project } from '../../types';
import { useAppContext } from '../../utils/AppContext';

interface ProjectCardProps {
  project: Project;
  index: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, index }) => {
  const { deleteProject } = useAppContext();
  const navigate = useNavigate();
  
  const priorityColors = {
    high: 'bg-state-error-light text-state-error',
    medium: 'bg-state-warning-light text-state-warning',
    low: 'bg-state-success-light text-state-success'
  };

  const assigneeIcon = project.assignee === 'Team' ? 'fas fa-users' : 'fas fa-user';

  return (
    <Draggable draggableId={project.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`project-card bg-bg-secondary rounded-lg p-4 border border-border-primary cursor-move
                   ${snapshot.isDragging ? 'shadow-lg bg-primary/10' : 'shadow-sm'}`}
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
                className="p-1.5 rounded bg-bg-secondary text-text-secondary hover:bg-state-error hover:text-white transition"
                title="Delete project"
              >
                <i className="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-text-secondary text-sm">{project.description}</p>
          </div>

          <div className="flex justify-between items-center">
            <div className={`px-2 py-1 text-xs rounded-full ${priorityColors[project.priority]}`}>
              {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
            </div>
            
            <div className="flex items-center text-text-muted">
              <i className={`${assigneeIcon} mr-1 text-sm`}></i>
              <span className="text-xs">{project.assignee}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default ProjectCard;
