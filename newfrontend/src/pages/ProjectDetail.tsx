import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppShell, Button, Group, Loader, NavLink, Stack, Text, Title } from '@mantine/core';
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
    <AppShell navbar={{ width: 240, breakpoint: 'sm' }} padding={0}>
      <AppShell.Navbar p="md" className="h-full">
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
      </AppShell.Navbar>

      <AppShell.Main className="w-full h-[calc(100vh-56px)] overflow-hidden min-h-0" p={0}>
        <Stack className="w-full h-full overflow-hidden min-h-0" style={{ padding: active === 'whiteboard' ? '0' : '20px' }}>
          {/* Заголовок перенесён в левую панель */}

          {active === 'tasks' && projectId && (
            <TaskBoardProvider projectId={projectId}>
              <div className="rounded-lg p-2 h-full w-full">
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
            projectId ? <ProjectRepositories projectId={projectId} /> : <Text>Нет projectId</Text>
          )}
          {active === 'settings' && projectId && (
            <ProjectSettings projectId={projectId} />
          )}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export default ProjectDetail;


