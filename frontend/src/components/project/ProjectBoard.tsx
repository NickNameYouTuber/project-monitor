import React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import type { Project, ProjectStatus } from '../../types';
import ProjectColumn from './ProjectColumn';
import { useAppContext } from '../../utils/AppContext';

interface ProjectBoardProps {
  projects: Project[];
  onProjectsChange?: (updatedProjects: Project[]) => void;
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects }) => {
  const { moveProject, reorderProjects } = useAppContext();

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Если нет назначения или перетаскивание вернулось на ту же позицию - ничего не делаем
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    // Если перемещаем проект внутри той же колонки
    if (source.droppableId === destination.droppableId) {
      const sourceProject = projects.find(p => p.id === draggableId);
      if (!sourceProject) return;
      
      // Находим проект, на место которого нужно поставить перетаскиваемый проект
      const columnProjects = projects
        .filter(p => p.status === sourceProject.status && p.id !== draggableId)
        .sort((a, b) => b.order - a.order);
      
      // Определяем ID проекта, на место которого нужно поставить перетаскиваемый
      const targetIndex = Math.min(destination.index, columnProjects.length - 1);
      const targetId = columnProjects[targetIndex]?.id || '';
      
      // Определяем позицию (выше или ниже)
      const position = destination.index <= targetIndex ? 'above' : 'below';
      
      // Обновляем порядок проектов
      if (targetId) {
        reorderProjects(draggableId, targetId, position);
      }
    } 
    // Если перемещаем проект между колонками
    else {
      // Получаем статус колонки назначения
      const destStatus = destination.droppableId as ProjectStatus;
      
      // Просто меняем статус проекта
      moveProject(draggableId, destStatus);
    }
  };

  // Статические колонки с заголовками и цветами
  const columns = [
    { 
      status: 'backlog' as ProjectStatus,
      title: 'Backlog', 
      colorClass: 'bg-gray-400'
    },
    { 
      status: 'pending' as ProjectStatus,
      title: 'Pending',
      colorClass: 'bg-yellow-400'
    },
    { 
      status: 'in_progress' as ProjectStatus,
      title: 'In Progress', 
      colorClass: 'bg-blue-400'
    },
    { 
      status: 'completed' as ProjectStatus,
      title: 'Completed',
      colorClass: 'bg-green-400'
    },
  ];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map(column => (
          <ProjectColumn
            key={column.status}
            title={column.title}
            status={column.status}
            projects={projects}
            colorClass={column.colorClass}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default ProjectBoard;
