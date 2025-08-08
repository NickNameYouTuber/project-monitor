import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { fetchRepository, type Repository } from '../api/repositories';

export default function RepositoryDetail() {
  const { repositoryId } = useParams();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!repositoryId) return;
      setLoading(true);
      try {
        const r = await fetchRepository(repositoryId);
        if (mounted) setRepo(r);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [repositoryId]);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  if (!repo) return <Text c="red">Репозиторий не найден</Text>;

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>{repo.name}</Title>
          {repo.description && <Text c="dimmed">{repo.description}</Text>}
        </div>
        <Button component={Link} to={repo.project_id ? `/projects/${repo.project_id}` : '/dashboards'} variant="light">Назад</Button>
      </Group>
    </Stack>
  );
}


