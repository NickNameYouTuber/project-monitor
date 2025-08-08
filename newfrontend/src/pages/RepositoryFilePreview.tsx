import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { fetchRepository, type Repository } from '../api/repositories';
import FileViewer from '../components/repositories/FileViewer';

export default function RepositoryFilePreview() {
  const { repositoryId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const path = params.get('path') || '';
  const branch = params.get('branch') || '';

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
    return () => { mounted = false; };
  }, [repositoryId]);

  if (loading) return (<Group justify="center" mt="xl"><Loader /></Group>);
  if (!repo) return <Text c="red">Репозиторий не найден</Text>;
  if (!path || !branch) return <Text c="dimmed">Не указан путь файла или ветка</Text>;

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>{repo.name}</Title>
          <Text c="dimmed">Просмотр файла</Text>
        </div>
        <Button variant="light" onClick={() => navigate(`/repositories/${repo.id}`)}>К списку файлов</Button>
      </Group>
      <FileViewer repositoryId={repo.id} branch={branch} path={path} />
    </Stack>
  );
}


