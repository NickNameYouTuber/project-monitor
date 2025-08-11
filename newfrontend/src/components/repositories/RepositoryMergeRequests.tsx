import { useEffect, useState } from 'react';
import { Button, Card, Group, Loader, Modal, Stack, Text, TextInput, Select, Badge, Tabs, Box } from '@mantine/core';
import { listBranches, listMergeRequests, createMergeRequest, approveMergeRequest, mergeMergeRequest, listMergeRequestComments, createMergeRequestComment, getMergeRequestDetail, getMergeRequestChanges, type MergeRequest, type MergeRequestComment, type MergeRequestDetail } from '../../api/repositories';

export default function RepositoryMergeRequests({ repositoryId }: { repositoryId: string }) {
  const [mrs, setMrs] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [activeMr, setActiveMr] = useState<MergeRequestDetail | null>(null);
  const [comments, setComments] = useState<MergeRequestComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'merged' | 'closed'>('open');
  const [changes, setChanges] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [mrsData, brs] = await Promise.all([
          listMergeRequests(repositoryId),
          listBranches(repositoryId),
        ]);
        if (!mounted) return;
        setMrs(mrsData);
        setBranches(brs.map(b => b.name));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [repositoryId]);

  async function openDetail(mr: MergeRequest) {
    const detail = await getMergeRequestDetail(repositoryId, mr.id);
    setActiveMr(detail);
    const list = await listMergeRequestComments(repositoryId, mr.id);
    setComments(list);
    try {
      const data = await getMergeRequestChanges(repositoryId, mr.id);
      const raw = (data.files || []).map((f: any) => f.diff || '').join('\n');
      setChanges(raw);
    } catch { setChanges(''); }
    setDetailOpen(true);
  }

  async function submitCreate() {
    if (!source || !target || !title.trim()) return;
    const mr = await createMergeRequest(repositoryId, { title, description, source_branch: source, target_branch: target });
    setMrs(prev => [mr, ...prev]);
    setOpen(false);
    setTitle(''); setDescription(''); setSource(null); setTarget(null);
  }

  async function submitApprove() {
    if (!activeMr) return;
    await approveMergeRequest(repositoryId, activeMr.id);
  }

  async function submitMerge() {
    if (!activeMr) return;
    const merged = await mergeMergeRequest(repositoryId, activeMr.id);
    const detail = await getMergeRequestDetail(repositoryId, merged.id);
    setActiveMr(detail);
    setMrs(prev => prev.map(m => m.id === merged.id ? merged : m));
  }

  async function submitComment() {
    if (!activeMr || !newComment.trim()) return;
    const c = await createMergeRequestComment(repositoryId, activeMr.id, newComment.trim());
    setComments(prev => [...prev, c]);
    setNewComment('');
  }

  if (loading) return <Group justify="center" mt="md"><Loader /></Group>;

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={600}>Merge Requests</Text>
        <Button onClick={() => setOpen(true)}>Создать MR</Button>
      </Group>
      <Tabs value={activeTab} onChange={(v) => setActiveTab((v as any) || 'open')}>
        <Tabs.List>
          <Tabs.Tab value="open">Открытые</Tabs.Tab>
          <Tabs.Tab value="merged">Смерженные</Tabs.Tab>
          <Tabs.Tab value="closed">Закрытые</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      {mrs.filter(m => m.status === activeTab).map(mr => (
        <Card key={mr.id} withBorder>
          <Group justify="space-between" align="flex-start">
            <Stack gap={2} onClick={() => openDetail(mr)} style={{ cursor: 'pointer', flex: 1 }}>
              <Text>{mr.title}</Text>
              {mr.description && <Text size="sm" c="dimmed">{mr.description}</Text>}
              <Text size="xs" c="dimmed">{mr.source_branch} → {mr.target_branch}</Text>
            </Stack>
            <Stack align="flex-end">
              <Badge variant="light">{mr.status}</Badge>
            </Stack>
          </Group>
        </Card>
      ))}

      <Modal opened={open} onClose={() => setOpen(false)} title="Создать Merge Request">
        <Stack>
          <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
          <TextInput label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          <Select label="Source" data={branches} value={source} onChange={setSource} searchable />
          <Select label="Target" data={branches} value={target} onChange={setTarget} searchable />
          <Button onClick={submitCreate}>Создать</Button>
        </Stack>
      </Modal>

      <Modal opened={detailOpen} onClose={() => setDetailOpen(false)} title={activeMr?.title} size="xl">
        {activeMr && (
          <Stack>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{activeMr.source_branch} → {activeMr.target_branch}</Text>
              <Badge variant="light">{activeMr.status}</Badge>
            </Group>
            {activeMr.description && <Text>{activeMr.description}</Text>}
            <Stack>
              <Group>
                <Button variant="light" onClick={submitApprove}>Approve</Button>
                <Button onClick={submitMerge}>Merge</Button>
              </Group>
              {activeMr.approvals?.length ? (
                <Group gap="xs">
                  <Text size="sm" c="dimmed">Approvals:</Text>
                  {activeMr.approvals.map(a => (
                    <Badge key={a.id} variant="light">{a.user_name || a.user_id}</Badge>
                  ))}
                </Group>
              ) : (
                <Text size="sm" c="dimmed">Нет апрувов</Text>
              )}
            </Stack>
            {changes && (
              <Box style={{ background: 'var(--mantine-color-dark-6)', borderRadius: 8, padding: 12, maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{changes}</pre>
              </Box>
            )}
            <Stack>
              {comments.map(c => (
                <Card key={c.id} withBorder>
                  <Text size="sm">{c.content}</Text>
                  <Text size="xs" c="dimmed">{new Date(c.created_at).toLocaleString()}</Text>
                </Card>
              ))}
              <Group>
                <TextInput placeholder="Комментарий" value={newComment} onChange={(e) => setNewComment(e.currentTarget.value)} style={{ flex: 1 }} />
                <Button onClick={submitComment}>Отправить</Button>
              </Group>
            </Stack>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}


