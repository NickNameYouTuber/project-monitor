import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import TaskBoard from '../tasks/TaskBoard';
import { TaskBoardProvider } from '../../context/TaskBoardContext';

const ProjectTaskBoard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentUser, fetchProject, currentProject } = useAppContext();

  // Загружаем данные проекта при монтировании компонента
  // Используем флаг, чтобы избежать бесконечных запросов
  const [isInitialFetchDone, setIsInitialFetchDone] = React.useState(false);
  
  useEffect(() => {
    // Загружаем проект только один раз при инициализации
    if (projectId && currentUser?.token && !isInitialFetchDone) {
      fetchProject(projectId, currentUser.token);
      setIsInitialFetchDone(true);
    }
  }, [projectId, currentUser?.token, isInitialFetchDone]);

  if (!currentProject) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-text-secondary">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="project-task-board">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to={`/dashboards/${currentProject?.dashboard_id || ''}`}
            className="text-primary hover:text-primary-hover flex items-center mb-2"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{currentProject?.name || 'Loading...'}</h1>
          <p className="text-text-secondary">{currentProject?.description}</p>
        </div>
      </div>

      <div className="rounded-lg shadow h-[calc(100vh-220px)] overflow-hidden">
        {projectId && (
          <TaskBoardProvider projectId={projectId}>
            <TaskBoard projectId={projectId} />
          </TaskBoardProvider>
        )}
      </div>
    </div>
  );
};

export default ProjectTaskBoard;
