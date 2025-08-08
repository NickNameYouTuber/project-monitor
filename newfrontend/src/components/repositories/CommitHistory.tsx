import { useEffect, useState } from 'react';
import { Anchor, Card, Drawer, Group, Loader, Stack, Text, Title } from '@mantine/core';
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
            <Stack>
              {detail.files.map((f) => (
                <Card key={f.path} withBorder>
                  <Text fw={600}>{f.path}</Text>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{f.diff}</pre>
                </Card>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Group justify="center" mt="md"><Loader /></Group>
        )}
      </Drawer>
    </Stack>
  );
}


