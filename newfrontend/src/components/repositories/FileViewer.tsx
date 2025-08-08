import { useEffect, useState } from 'react';
import { ActionIcon, Group, Loader, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { fetchFileContent, type GitFileContent } from '../../api/repositories';
import { IconLink, IconFileDownload } from '@tabler/icons-react';

interface Props {
  repositoryId: string;
  branch: string;
  path: string;
}

export default function FileViewer({ repositoryId, branch, path }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GitFileContent | null>(null);
  const rawUrl = `/api/repositories/${repositoryId}/content/${encodeURIComponent(path)}?branch=${encodeURIComponent(branch)}`;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchFileContent(repositoryId, path, branch)
      .then((d) => mounted && setData(d))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [repositoryId, path, branch]);

  if (loading) return (
    <Group justify="center" mt="md"><Loader /></Group>
  );

  if (!data) return <Text c="red">Файл не найден</Text>;

  const permalink = window.location.origin + window.location.pathname + `?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`;

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={600}>{path}</Text>
        <Group gap="xs">
          <Tooltip label="Permalink">
            <ActionIcon variant="light" onClick={() => navigator.clipboard.writeText(permalink)}>
              <IconLink size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Скачать RAW">
            <ActionIcon variant="light" component="a" href={rawUrl} target="_blank" rel="noreferrer">
              <IconFileDownload size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      <Paper withBorder p="md">
        {data.binary ? (
          <Text>Бинарный файл ({data.size} байт). Используйте кнопку RAW для скачивания.</Text>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{data.content}</pre>
        )}
      </Paper>
    </Stack>
  );
}


