import React from 'react';
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
  
  const priorityColors = {
    high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
  };

  const assigneeIcon = project.assignee === 'Team' ? 'fas fa-users' : 'fas fa-user';

  return (
    <div
      className="project-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 cursor-move"
      draggable
      onDragStart={(e) => onDragStart(e, project)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, project.id)}
      data-project-id={project.id}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-white text-lg">{project.name}</h3>
        <button 
          onClick={() => {
            if(confirm('Are you sure you want to delete this project?')) {
              deleteProject(project.id);
            }
          }} 
          className="p-1.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-800/40 hover:text-red-600 dark:hover:text-red-300 transition"
        >
          <i className="fas fa-trash text-sm"></i>
        </button>
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{project.description}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[project.priority]}`}>
            {project.priority.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <i className={`${assigneeIcon} mr-1`}></i>
            {project.assignee}
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">#{project.id}</span>
      </div>
    </div>
  );
};

export default ProjectCard;
