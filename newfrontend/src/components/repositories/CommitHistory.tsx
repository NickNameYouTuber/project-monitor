import { useEffect, useState } from 'react';
import { Anchor, Card, Drawer, Group, Loader, Stack, Text, Title, Tabs, Badge, Box } from '@mantine/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { listCommits, getCommitDetail, type GitCommitDetail, type GitCommitShort } from '../../api/repositories';

export default function CommitHistory({ repositoryId, branch }: { repositoryId: string; branch?: string }) {
  const [commits, setCommits] = useState<GitCommitShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [detail, setDetail] = useState<GitCommitDetail | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listCommits(repositoryId, { branch, limit: 50 })
      .then((c) => mounted && setCommits(c))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [repositoryId, branch]);

  async function openDetail(hash: string) {
    const d = await getCommitDetail(repositoryId, hash);
    setDetail(d);
    setOpened(true);
  }

  if (loading) return <Group justify="center" mt="md"><Loader /></Group>;

  return (
    <Stack>
      <Card withBorder>
        <Stack>
          {commits.map((c) => (
            <Group key={c.hash} justify="space-between">
              <Stack gap={2}>
                <Anchor onClick={() => openDetail(c.hash)}>{c.message}</Anchor>
                <Text size="xs" c="dimmed">{c.short_hash} • {new Date(c.date).toLocaleString()} • {c.author}</Text>
              </Stack>
              {c.stats && (
                <Text size="xs" c="dimmed">{c.stats.files_changed} files • +{c.stats.insertions} −{c.stats.deletions}</Text>
              )}
            </Group>
          ))}
        </Stack>
      </Card>

      <Drawer opened={opened} onClose={() => setOpened(false)} position="right" size="xl" title={<Title order={4}>Коммит {detail?.hash?.slice(0,8)}</Title>}>
        {detail ? (
          <Stack>
            <Text>{detail.message}</Text>
            <Text size="sm" c="dimmed">{detail.author} • {new Date(detail.date).toLocaleString()}</Text>
            <Tabs defaultValue="diff">
              <Tabs.List>
                <Tabs.Tab value="diff">Изменения</Tabs.Tab>
                <Tabs.Tab value="meta">Метаданные</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="diff" pt="sm">
                <Stack>
                  {detail.files.map((f) => {
                    const raw = f.diff || '';
                    const cleanedDiff = cleanDiffContent(raw);
                    const originalLines = cleanedDiff.split('\n');
                    const displayDiff = originalLines
                      .map((ln) => (ln.startsWith('+') || ln.startsWith('-') ? ln.slice(1) : ln))
                      .join('\n');
                    return (
                      <Card key={f.path} withBorder>
                        <Group justify="space-between" mb={8}>
                          <Text fw={600}>{f.path}</Text>
                          <Badge variant="light">{f.change_type}</Badge>
                        </Group>
                        {cleanedDiff ? (
                          <Box style={{ overflow: 'auto' }}>
                            <SyntaxHighlighter
                              language={getLanguageFromPath(f.path)}
                              style={oneDark}
                              showLineNumbers
                              wrapLongLines
                              lineNumberStyle={{ color: '#666', fontSize: '12px' }}
                              customStyle={{ 
                                margin: 0, 
                                padding: '12px',
                                background: 'var(--mantine-color-dark-6)'
                              }}
                              lineProps={(lineNumber: number) => {
                                const line = originalLines[lineNumber - 1] || '';
                                if (!line) return {};
                                if (line.startsWith('+')) {
                                  return { style: { backgroundColor: 'rgba(40, 167, 69, 0.2)' } };
                                }
                                if (line.startsWith('-')) {
                                  return { style: { backgroundColor: 'rgba(220, 53, 69, 0.2)' } };
                                }
                                return {};
                              }}
                            >
                              {displayDiff}
                            </SyntaxHighlighter>
                          </Box>
                        ) : (
                          <Text size="sm" c="dimmed">Нет изменений</Text>
                        )}
                      </Card>
                    );
                  })}
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="meta" pt="sm">
                <Card withBorder>
                  <Text size="sm">Hash: {detail.hash}</Text>
                  <Text size="sm">Дата: {new Date(detail.date).toLocaleString()}</Text>
                  <Text size="sm">Автор: {detail.author}</Text>
                  <Text size="sm">Родители: {detail.parent_hashes?.join(', ') || '—'}</Text>
                </Card>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        ) : (
          <Group justify="center" mt="md"><Loader /></Group>
        )}
      </Drawer>
    </Stack>
  );
}

function cleanDiffContent(rawDiff: string): string {
  if (!rawDiff) return '';
  
  // Убираем все git заголовки и метаданные
  const lines = rawDiff.split('\n');
  const cleanLines: string[] = [];
  
  for (const line of lines) {
    // Пропускаем все git метаданные
    if (line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('+++') ||
        line.startsWith('---') ||
        line.match(/^@@.*@@/)) {
      continue;
    }
    
    // Добавляем только строки с изменениями и контекст
    if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
      cleanLines.push(line);
    }
  }
  
  return cleanLines.join('\n');
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'php': 'php',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'sh': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sql': 'sql',
    'md': 'markdown',
    'dockerfile': 'dockerfile'
  };
  
  return langMap[ext] || 'text';
}


