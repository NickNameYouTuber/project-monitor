import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button, Group, Loader, NavLink, Stack, Text, Title } from '@mantine/core';
import { fetchProject, type Project } from '../api/projects';
import WhiteboardPage from './WhiteboardPage';
import { TaskBoardProvider } from '../context/TaskBoardContext';
import TaskBoard from '../components/tasks/TaskBoard';
import ProjectRepositories from '../components/repositories/ProjectRepositories';
import ProjectSettings from './ProjectSettings';

function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const active: 'tasks' | 'whiteboard' | 'repositories' | 'settings' = (location.pathname.endsWith('/repositories')
    ? 'repositories'
    : location.pathname.endsWith('/settings')
    ? 'settings'
    : location.pathname.endsWith('/whiteboard')
    ? 'whiteboard'
    : 'tasks');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!projectId) return;
      setLoading(true);
      try {
        const p = await fetchProject(projectId);
        if (mounted) setProject(p);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  if (!project) {
    return <Text c="red">Проект не найден</Text>;
  }

  return (
    <div className="flex h-full">
      {/* Левая панель навигации */}
      <div className="flex-shrink-0 w-60 bg-gray-50 border-r border-gray-200 p-4">
        <Stack className="h-full">
          <div>
            <Title order={4} mb={4}>{project.name}</Title>
            {project.description && <Text size="sm" c="dimmed">{project.description}</Text>}
          </div>
          <NavLink label="Доска задач" component={Link} to={`/projects/${project.id}/tasks`} active={active === 'tasks'} />
          <NavLink label="Вайтборд" component={Link} to={`/projects/${project.id}/whiteboard`} active={active === 'whiteboard'} />
          <NavLink label="Репозитории" component={Link} to={`/projects/${project.id}/repositories`} active={active === 'repositories'} />
          <NavLink label="Настройки" component={Link} to={`/projects/${project.id}/settings`} active={active === 'settings'} />
          <Button component={Link} to={`/dashboards/${project.dashboard_id || ''}`} variant="light">
            Назад к дашборду
          </Button>
        </Stack>
      </div>

      {/* Правая панель контента */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="w-full h-full overflow-hidden" style={{ padding: active === 'whiteboard' ? '0' : '20px' }}>
          {active === 'tasks' && projectId && (
            <TaskBoardProvider projectId={projectId}>
              <div className="rounded-lg p-2 h-full w-full overflow-hidden">
                <TaskBoard />
              </div>
            </TaskBoardProvider>
          )}
          {active === 'whiteboard' && projectId && (
            <div className="w-full h-full overflow-hidden m-0 p-0 min-h-0">
              <WhiteboardPage />
            </div>
          )}
          {active === 'repositories' && (
            <div className="h-full overflow-auto">
              {projectId ? <ProjectRepositories projectId={projectId} /> : <Text>Нет projectId</Text>}
            </div>
          )}
          {active === 'settings' && projectId && (
            <div className="h-full overflow-auto">
              <ProjectSettings projectId={projectId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;


