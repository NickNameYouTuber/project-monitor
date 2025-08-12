import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Group, Loader, Stack, Text } from '@mantine/core';
import { fetchDashboard, type Dashboard } from '../api/dashboards';
import { fetchProjectsByDashboard, type Project } from '../api/projects';
import DashboardProjectsBoard from '../components/dashboards/DashboardProjectsBoard';

function DashboardDetail() {
  const { dashboardId } = useParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [_, setProjects] = useState<Project[]>([]);
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
    <Stack className="h-full w-full px-4 md:px-6 lg:px-8">
      <Group justify="space-between" align="center" className="mb-2">
        <h2 className="text-xl font-semibold">Дашборд: {dashboard.name}</h2>
        <Button component={Link} to="/dashboards" variant="light">Назад</Button>
      </Group>

      <div className="flex-1 min-h-0">
        <DashboardProjectsBoard dashboardId={dashboardId!} />
      </div>
    </Stack>
  );
}

export default DashboardDetail;


