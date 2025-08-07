import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell, Button, Group, Loader, NavLink, Stack, Text, Title } from '@mantine/core';
import { fetchProject, type Project } from '../api/projects';

function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<'tasks' | 'whiteboard' | 'settings'>('tasks');

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
          <NavLink label="Доска задач" active={active === 'tasks'} onClick={() => setActive('tasks')} />
          <NavLink label="Вайтборд" active={active === 'whiteboard'} onClick={() => setActive('whiteboard')} />
          <NavLink label="Настройки" active={active === 'settings'} onClick={() => setActive('settings')} />
          <Button component={Link} to={`/dashboards/${project.dashboard_id || ''}`} variant="light">
            Назад к дашборду
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack>
          <Group justify="space-between" align="center">
            <div>
              <Title order={2}>{project.name}</Title>
              {project.description && <Text c="dimmed">{project.description}</Text>}
            </div>
          </Group>

          {active === 'tasks' && (
            <Text>Здесь будет доска задач проекта</Text>
          )}
          {active === 'whiteboard' && (
            <Text>Здесь будет вайтборд проекта</Text>
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


