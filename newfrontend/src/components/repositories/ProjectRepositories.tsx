import { useEffect, useState } from 'react';
import { Card, Grid, Group, Loader, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { fetchProjectRepositories, type Repository } from '../../api/repositories';

export default function ProjectRepositories({ projectId }: { projectId: string }) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProjectRepositories(projectId)
      .then((data) => {
        if (mounted) setRepos(data);
      })
      .finally(() => mounted && setLoading(false));
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

  return (
    <Stack>
      <Text fw={600}>Репозитории проекта</Text>
      <Grid>
        {repos.map((r) => (
          <Grid.Col key={r.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder shadow="xs" padding="md" component={Link} to={`/repositories/${r.id}`}>
              <Text fw={600}>{r.name}</Text>
              {r.description && (
                <Text c="dimmed" size="sm" mt={6}>{r.description}</Text>
              )}
              <Text size="xs" c="dimmed" mt={8}>Visibility: {r.visibility}</Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
      {repos.length === 0 && <Text c="dimmed">Нет репозиториев</Text>}
    </Stack>
  );
}


