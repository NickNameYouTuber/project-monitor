import { useEffect, useState } from 'react';
import { Anchor, Card, Drawer, Group, Loader, Stack, Text, Title, Tabs, Badge } from '@mantine/core';
import { parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
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
                    const language = guessLanguageFromPath(f.path);
                    const looksLikeUnified = raw.includes('diff --git') || (raw.includes('--- ') && raw.includes('+++ ')) || raw.includes('@@');
                    let parsed: ReturnType<typeof parseDiff> | null = null;
                    if (looksLikeUnified) {
                      try {
                        parsed = parseDiff(raw, { nearbySequences: 'zip' });
                      } catch {
                        parsed = null;
                      }
                    }
                    return (
                      <Card key={f.path} withBorder>
                        <Group justify="space-between" mb={8}>
                          <Text fw={600}>{f.path}</Text>
                          <Badge variant="light">{f.change_type}</Badge>
                        </Group>
                        {parsed && parsed.length > 0 ? (
                          <Stack gap={4}>
                            {parsed.flatMap(file => file.hunks).flatMap(h => h.changes)
                              .filter(change => change.type === 'insert' || change.type === 'delete')
                              .map((change, idx) => {
                                const oldNum = change.type === 'delete' ? (change as any).lineNumber : '';
                                const newNum = change.type === 'insert' ? (change as any).lineNumber : '';
                                return (
                                  <div
                                    key={change.content + '-' + oldNum + '-' + newNum + '-' + idx}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '60px 60px 1fr',
                                      gap: 8,
                                      alignItems: 'stretch',
                                      background: change.type === 'insert' ? 'rgba(46, 160, 67, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                                      borderRadius: 6,
                                      padding: '4px 8px'
                                    }}
                                  >
                                    <Text size="xs" c="dimmed" ta="right">{oldNum}</Text>
                                    <Text size="xs" c="dimmed" ta="right">{newNum}</Text>
                                    <div>
                                      <SyntaxHighlighter language={language} style={oneDark} customStyle={{ margin: 0, background: 'transparent' }} PreTag="div" wrapLongLines>
                                        {stripDiffMarker(change.content)}
                                      </SyntaxHighlighter>
                                    </div>
                                  </div>
                                );
                              })}
                          </Stack>
                        ) : raw ? (
                          <Stack gap={4}>
                            {raw.split('\n')
                              .filter(line => !(line.startsWith('@@') || line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')))
                              .filter(line => line.startsWith('+') || line.startsWith('-'))
                              .map((line, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 60px 1fr',
                                    gap: 8,
                                    alignItems: 'stretch',
                                    background: line.startsWith('+') ? 'rgba(46, 160, 67, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                                    borderRadius: 6,
                                    padding: '4px 8px'
                                  }}
                                >
                                  <Text size="xs" c="dimmed" ta="right"></Text>
                                  <Text size="xs" c="dimmed" ta="right"></Text>
                                  <div>
                                    <SyntaxHighlighter language={language} style={oneDark} customStyle={{ margin: 0, background: 'transparent' }} PreTag="div" wrapLongLines>
                                      {stripDiffMarker(line)}
                                    </SyntaxHighlighter>
                                  </div>
                                </div>
                              ))}
                          </Stack>
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

function stripDiffMarker(content: string): string {
  if (content.startsWith('+') || content.startsWith('-')) return content.slice(1);
  return content;
}

function guessLanguageFromPath(path: string): string | undefined {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'tsx';
    case 'js':
    case 'jsx':
      return 'jsx';
    case 'py':
      return 'python';
    case 'md':
      return 'markdown';
    case 'json':
      return 'json';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    default:
      return undefined;
  }
}