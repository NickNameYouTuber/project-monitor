import { useEffect, useState } from 'react';
import { ActionIcon, Badge, Button, Card, Group, Loader, Modal, ScrollArea, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import { fetchPipelines, fetchPipelineDetail, triggerPipeline, type PipelineListItem, type PipelineDetail } from '../../api/repositories';
import { IconRefresh, IconPlayerPlay, IconListDetails } from '@tabler/icons-react';

export default function RepositoryPipelines({ repositoryId }: { repositoryId: string }) {
  const [items, setItems] = useState<PipelineListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PipelineDetail | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchPipelines(repositoryId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
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
              <Text size="sm">{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}</Text>
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
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}


