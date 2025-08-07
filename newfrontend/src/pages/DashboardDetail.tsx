import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { fetchDashboard, type Dashboard } from '../api/dashboards';
import { fetchProjectsByDashboard, type Project } from '../api/projects';

function DashboardDetail() {
  const { dashboardId } = useParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!dashboardId) return;
      setLoading(true);
      try {
        const [d, p] = await Promise.all([
          fetchDashboard(dashboardId),
          fetchProjectsByDashboard(dashboardId),
        ]);
        if (mounted) {
          setDashboard(d);
          setProjects(p);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [dashboardId]);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  if (!dashboard) {
    return <Text c="red">Дашборд не найден</Text>;
  }

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>{dashboard.name}</Title>
          {dashboard.description && (
            <Text c="dimmed" size="sm">{dashboard.description}</Text>
          )}
        </div>
        <Button component={Link} to="/dashboards" variant="light">Назад</Button>
      </Group>

      <Title order={4}>Проекты</Title>
      <Grid>
        {projects.map((p) => (
          <Grid.Col key={p.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder shadow="sm" padding="lg" component={Link} to={`/projects/${p.id}`}>
              <Text fw={600}>{p.name}</Text>
              {p.description && (
                <Text c="dimmed" size="sm" mt={6}>{p.description}</Text>
              )}
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {projects.length === 0 && (
        <Text c="dimmed">Проектов пока нет</Text>
      )}
    </Stack>
  );
}

export default DashboardDetail;


