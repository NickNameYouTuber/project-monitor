import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Badge, Button, Card, Group, Loader, Modal, ScrollArea, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import { fetchPipelines, fetchPipelineDetail, triggerPipeline, cancelPipeline, getJobLogs, type PipelineListItem, type PipelineDetail } from '../../api/repositories';
import { IconRefresh, IconPlayerPlay, IconListDetails } from '@tabler/icons-react';

export default function RepositoryPipelines({ repositoryId }: { repositoryId: string }) {
  const [items, setItems] = useState<PipelineListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PipelineDetail | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsJobId, setLogsJobId] = useState<string | null>(null);
  const [logsText, setLogsText] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);
  const logsIntervalRef = useRef<number | null>(null);
  const logsScrollRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const list = await fetchPipelines(repositoryId);
      setItems((prev) => {
        // map by id for quick diff
        const prevMap = new Map(prev.map((p) => [p.id, p]));
        const next: PipelineListItem[] = [];
        for (const it of list) {
          const old = prevMap.get(it.id);
          if (!old) {
            next.push(it);
          } else {
            // Update only changed fields
            if (
              old.status !== it.status ||
              old.commit_sha !== it.commit_sha ||
              old.ref !== it.ref ||
              old.source !== it.source ||
              old.created_at !== it.created_at
            ) {
              next.push(it);
            } else {
              next.push(old);
            }
            prevMap.delete(it.id);
          }
        }
        return next;
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [repositoryId]);

  async function openDetail(id: string) {
    setFetchingOne(true);
    try {
      const d = await fetchPipelineDetail(id);
      setSelected(d);
    } finally {
      setFetchingOne(false);
    }
  }

  async function manualTrigger() {
    const d = await triggerPipeline(repositoryId);
    setSelected(d);
    load();
  }

  function statusBadge(s: PipelineListItem['status']) {
    const color = s === 'success' ? 'green' : s === 'failed' ? 'red' : s === 'running' ? 'blue' : 'gray';
    const label = s.toUpperCase();
    return <Badge color={color}>{label}</Badge>;
  }

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={4}>Пайплайны</Title>
        <Group>
          <Tooltip label="Запустить пайплайн">
            <Button leftSection={<IconPlayerPlay size={16} />} onClick={manualTrigger}>Run</Button>
          </Tooltip>
          <ActionIcon variant="subtle" onClick={load} aria-label="refresh">
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Card withBorder padding="sm">
        {loading ? (
          <Group justify="center" py="lg"><Loader /></Group>
        ) : items.length === 0 ? (
          <Text c="dimmed">Нет запусков</Text>
        ) : (
          <ScrollArea h={360}>
            <Table striped highlightOnHover withRowBorders={false} verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Источник</Table.Th>
                  <Table.Th>Ref</Table.Th>
                  <Table.Th>Commit</Table.Th>
                  <Table.Th>Создан</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{statusBadge(p.status)}</Table.Td>
                    <Table.Td>{p.source}</Table.Td>
                    <Table.Td>{p.ref || '-'}</Table.Td>
                    <Table.Td><Text ff="mono" size="sm">{p.commit_sha?.slice(0, 8) || '-'}</Text></Table.Td>
                    <Table.Td><Text size="sm">{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</Text></Table.Td>
                    <Table.Td width={60}>
                      <ActionIcon variant="light" onClick={() => openDetail(p.id)} title="Детали">
                        <IconListDetails size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Modal opened={!!selected} onClose={() => setSelected(null)} title="Детали пайплайна" size="lg">
        {!selected || fetchingOne ? (
          <Group justify="center" py="lg"><Loader /></Group>
        ) : (
          <Stack>
            <Group justify="space-between">
              <Group>
                {statusBadge(selected.status)}
                <Text>{selected.source}</Text>
              </Group>
              <Group gap="xs">
                <Text size="sm">{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}</Text>
                {selected.status === 'running' && (
                  <Button variant="light" color="red" size="xs" onClick={async () => { await cancelPipeline(selected.id); await openDetail(selected.id); load(); }}>Остановить</Button>
                )}
              </Group>
            </Group>
            <Card withBorder padding="sm">
              <Table withRowBorders={false} verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Job</Table.Th>
                    <Table.Th>Stage</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Image</Table.Th>
                    <Table.Th>Exit</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selected.jobs?.map((j) => (
                    <Table.Tr key={j.id}>
                      <Table.Td>{j.name}</Table.Td>
                      <Table.Td>{j.stage || '-'}</Table.Td>
                      <Table.Td>{statusBadge(j.status as any)}</Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{j.image}</Text></Table.Td>
                      <Table.Td>{j.exit_code ?? ''}</Table.Td>
                      <Table.Td width={90}>
                        <Button size="xs" variant="light" onClick={async () => {
                          setLogsJobId(j.id);
                          setLogsOpen(true);
                          setLogsLoading(true);
                          try {
                            const logs = await getJobLogs(j.id);
                            setLogsText(logs || "");
                            // Auto-scroll to bottom
                            setTimeout(() => {
                              if (logsScrollRef.current) {
                                logsScrollRef.current.scrollTop = logsScrollRef.current.scrollHeight;
                              }
                            }, 0);
                          } finally {
                            setLogsLoading(false);
                          }
                          // If running, start polling
                          if (j.status === 'running') {
                            if (logsIntervalRef.current) window.clearInterval(logsIntervalRef.current);
                            logsIntervalRef.current = window.setInterval(async () => {
                              const txt = await getJobLogs(j.id);
                              setLogsText(txt || "");
                              if (logsScrollRef.current) {
                                logsScrollRef.current.scrollTop = logsScrollRef.current.scrollHeight;
                              }
                            }, 2000) as unknown as number;
                          }
                        }}>Логи</Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        )}
      </Modal>

      <Modal opened={logsOpen} onClose={() => {
        setLogsOpen(false);
        setLogsJobId(null);
        if (logsIntervalRef.current) window.clearInterval(logsIntervalRef.current);
      }} title="Логи job" size="lg">
        {logsLoading ? (
          <Group justify="center" py="lg"><Loader /></Group>
        ) : (
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{logsJobId}</Text>
              <Group gap="xs">
                <Button variant="light" size="xs" onClick={() => navigator.clipboard.writeText(logsText || '')}>Скопировать</Button>
                <Button variant="light" size="xs" onClick={() => {
                  const blob = new Blob([logsText || ''], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `job-${logsJobId || 'logs'}.log`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>Скачать</Button>
              </Group>
            </Group>
            <Card withBorder padding="xs">
              <ScrollArea h={420} viewportRef={logsScrollRef}>
                <pre style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{(logsText || '').replace(/</g, '\u003c')}</pre>
              </ScrollArea>
            </Card>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}


