import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell, Button, Card, Grid, Group, Loader, NavLink, Stack, Text, Title } from '@mantine/core';
import { fetchProject, type Project } from '../api/projects';
import { fetchRepositoriesByProject, type Repository } from '../api/repositories';
import TaskBoard from '../components/tasks/TaskBoard';

function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<'tasks' | 'whiteboard' | 'settings'>('tasks');
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!projectId) return;
      setLoading(true);
      try {
        const [p, repos] = await Promise.all([
          fetchProject(projectId),
          fetchRepositoriesByProject(projectId),
        ]);
        if (mounted) {
          setProject(p);
          setRepositories(repos);
        }
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

          {active === 'tasks' && projectId && <TaskBoard projectId={projectId} />}
          {active === 'whiteboard' && (
            <Text>Здесь будет вайтборд проекта</Text>
          )}
          {active === 'settings' && (
            <Text>Настройки проекта</Text>
          )}

          <Title order={4}>Репозитории</Title>
          <Grid>
            {repositories.map((r) => (
              <Grid.Col key={r.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Card withBorder shadow="sm" padding="lg">
                  <Text fw={600}>{r.name}</Text>
                  {r.description && <Text c="dimmed" size="sm" mt={6}>{r.description}</Text>}
                </Card>
              </Grid.Col>
            ))}
          </Grid>
          {repositories.length === 0 && <Text c="dimmed">Нет привязанных репозиториев</Text>}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export default ProjectDetail;


