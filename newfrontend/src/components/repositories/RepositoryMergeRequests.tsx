import { useEffect, useState } from 'react';
import { Button, Card, Group, Loader, Modal, Stack, Text, TextInput, Select, Badge } from '@mantine/core';
import { listBranches, listMergeRequests, createMergeRequest, approveMergeRequest, mergeMergeRequest, listMergeRequestComments, createMergeRequestComment, type MergeRequest, type MergeRequestComment } from '../../api/repositories';

export default function RepositoryMergeRequests({ repositoryId }: { repositoryId: string }) {
  const [mrs, setMrs] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [activeMr, setActiveMr] = useState<MergeRequest | null>(null);
  const [comments, setComments] = useState<MergeRequestComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

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
    setActiveMr(mr);
    const list = await listMergeRequestComments(repositoryId, mr.id);
    setComments(list);
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
    setActiveMr(merged);
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
      {mrs.map(mr => (
        <Card key={mr.id} withBorder>
          <Group justify="space-between">
            <Stack gap={2} onClick={() => openDetail(mr)} style={{ cursor: 'pointer' }}>
              <Text>{mr.title}</Text>
              <Text size="xs" c="dimmed">{mr.source_branch} → {mr.target_branch}</Text>
            </Stack>
            <Badge variant="light">{mr.status}</Badge>
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

      <Modal opened={detailOpen} onClose={() => setDetailOpen(false)} title={activeMr?.title} size="lg">
        {activeMr && (
          <Stack>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{activeMr.source_branch} → {activeMr.target_branch}</Text>
              <Badge variant="light">{activeMr.status}</Badge>
            </Group>
            <Group>
              <Button variant="light" onClick={submitApprove}>Approve</Button>
              <Button onClick={submitMerge}>Merge</Button>
            </Group>
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


