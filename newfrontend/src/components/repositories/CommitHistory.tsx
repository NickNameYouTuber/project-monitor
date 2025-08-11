import { useEffect, useState } from 'react';
import { Anchor, Card, Drawer, Group, Loader, Stack, Text, Title, Tabs, Badge } from '@mantine/core';
import { Diff, Hunk, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';
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
                          parsed.map(file => (
                            <Diff key={file.newPath || file.oldPath} viewType="split" diffType={file.type} hunks={file.hunks}>
                              {hunks => hunks.map(h => <Hunk key={h.content} hunk={h} />)}
                            </Diff>
                          ))
                        ) : raw ? (
                          <pre style={{ background: 'var(--mantine-color-dark-6)', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
                            {raw}
                          </pre>
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


