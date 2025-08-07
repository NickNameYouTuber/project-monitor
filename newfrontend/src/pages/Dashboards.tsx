import { useEffect, useState } from 'react';
import { Card, Grid, Group, Loader, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { fetchDashboards, type Dashboard } from '../api/dashboards';

function Dashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchDashboards()
      .then((data) => {
        if (mounted) setDashboards(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack>
      <Text fw={700} size="xl" className="mb-2">
        Дашборды
      </Text>
      <Grid>
        {dashboards.map((d) => (
          <Grid.Col key={d.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder shadow="sm" padding="lg" component={Link} to={`/dashboards/${d.id}`}>
              <Text fw={600}>{d.name}</Text>
              {d.description && (
                <Text c="dimmed" size="sm" mt={6}>
                  {d.description}
                </Text>
              )}
            </Card>
          </Grid.Col>
        ))}
      </Grid>
      {dashboards.length === 0 && (
        <Text c="dimmed">Нет доступных дашбордов</Text>
      )}
    </Stack>
  );
}

export default Dashboards;

