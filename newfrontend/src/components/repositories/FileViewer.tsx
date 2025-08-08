import { useEffect, useState } from 'react';
import { ActionIcon, Group, Loader, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { fetchFileContent, type GitFileContent } from '../../api/repositories';
import { IconLink, IconFileDownload } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
        ) : path.toLowerCase().endsWith('.md') ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
        ) : (
          <SyntaxHighlighter language={detectLanguage(path)} style={oneDark} wrapLongLines>
            {data.content}
          </SyntaxHighlighter>
        )}
      </Paper>
    </Stack>
  );
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'tsx';
    case 'js':
    case 'jsx':
      return 'jsx';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'go':
      return 'go';
    case 'rb':
      return 'ruby';
    case 'php':
      return 'php';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'md':
      return 'markdown';
    case 'html':
    case 'htm':
      return 'html';
    default:
      return '';
  }
}


