import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell, Button, Group, Loader, NavLink, Stack, Text, Title } from '@mantine/core';
import { fetchProject, type Project } from '../api/projects';
import { TaskBoardProvider } from '../context/TaskBoardContext';
import TaskBoard from '../components/tasks/TaskBoard';
import ProjectRepositories from '../components/repositories/ProjectRepositories';
import { Button as MantineButton } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<'tasks' | 'whiteboard' | 'repositories' | 'settings'>('tasks');

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
    <AppShell navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar p="md">
        <Stack>
          <div>
            <Title order={4} mb={4}>{project.name}</Title>
            {project.description && <Text size="sm" c="dimmed">{project.description}</Text>}
          </div>
          <NavLink label="Доска задач" active={active === 'tasks'} onClick={() => setActive('tasks')} />
          <NavLink label="Вайтборд" active={active === 'whiteboard'} onClick={() => setActive('whiteboard')} />
          <NavLink label="Репозитории" active={active === 'repositories'} onClick={() => setActive('repositories')} />
          <NavLink label="Настройки" active={active === 'settings'} onClick={() => setActive('settings')} />
          <Button component={Link} to={`/dashboards/${project.dashboard_id || ''}`} variant="light">
            Назад к дашборду
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack>
          {/* Заголовок перенесён в левую панель */}

          {active === 'tasks' && projectId && (
            <TaskBoardProvider projectId={projectId}>
              <div className="rounded-lg p-2">
                <TaskBoard />
              </div>
            </TaskBoardProvider>
          )}
          {active === 'whiteboard' && (
            <Text>Здесь будет вайтборд проекта</Text>
          )}
          {active === 'repositories' && (
            <Stack>
              {projectId ? <ProjectRepositories projectId={projectId} /> : <Text>Нет projectId</Text>}
              <Group>
                <MantineButton onClick={() => navigate('/repositories/create')}>Создать репозиторий</MantineButton>
              </Group>
            </Stack>
          )}
          {active === 'settings' && (
            <Text>Настройки проекта</Text>
          )}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export default ProjectDetail;


