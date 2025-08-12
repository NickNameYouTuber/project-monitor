import { useEffect, useState } from 'react';
import { Button, Card, Divider, Group, Loader, Modal, Stack, Text, TextInput, Select, Badge, Tabs } from '@mantine/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { listBranches, listMergeRequests, createMergeRequest, approveMergeRequest, mergeMergeRequest, listMergeRequestComments, createMergeRequestComment, getMergeRequestDetail, getMergeRequestChanges, unapproveMergeRequest, closeMergeRequest, type MergeRequest, type MergeRequestComment, type MergeRequestDetail, type MergeRequestChanges } from '../../api/repositories';

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
  const [changes, setChanges] = useState<MergeRequestChanges | null>(null);
  

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
      setChanges(data);
    } catch { setChanges(null); }
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
    const detail = await getMergeRequestDetail(repositoryId, activeMr.id);
    setActiveMr(detail);
  }

  async function submitUnapprove() {
    if (!activeMr) return;
    await unapproveMergeRequest(repositoryId, activeMr.id);
    const detail = await getMergeRequestDetail(repositoryId, activeMr.id);
    setActiveMr(detail);
  }

  async function submitMerge() {
    if (!activeMr) return;
    const merged = await mergeMergeRequest(repositoryId, activeMr.id);
    const detail = await getMergeRequestDetail(repositoryId, merged.id);
    setActiveMr(detail);
    setMrs(prev => prev.map(m => m.id === merged.id ? merged : m));
  }

  async function submitClose() {
    if (!activeMr) return;
    const closed = await closeMergeRequest(repositoryId, activeMr.id);
    const detail = await getMergeRequestDetail(repositoryId, activeMr.id);
    setActiveMr(detail);
    setMrs(prev => prev.map(m => m.id === closed.id ? closed : m));
  }

  // Reopen оставим реализованным, но кнопки нет по текущим требованиям

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
                {activeMr.status === 'open' && (
                  <>
                    <Button variant="light" onClick={submitApprove}>Approve</Button>
                    <Button variant="light" onClick={submitUnapprove}>Unapprove</Button>
                    <Button onClick={submitMerge}>Merge</Button>
                    <Button color="red" variant="light" onClick={submitClose}>Закрыть</Button>
                  </>
                )}
                {activeMr.status === 'merged' && (
                  <Button color="red" variant="light" onClick={submitClose}>Закрыть</Button>
                )}
                {/* closed: no actions */}
              </Group>
              {activeMr.approvals?.length ? (
                <Group gap="xs">
                  <Text size="sm" c="dimmed">Approvals:</Text>
                  {activeMr.approvals.map(a => (
                    <Badge key={a.id} variant="light">{a.user_name || a.user_id}</Badge>
                  ))}
                </Group>
              ) : (
                <Text size="sm" c="dimmed">Approvals: нет</Text>
              )}
            </Stack>
            <Tabs defaultValue="changes">
              <Tabs.List>
                <Tabs.Tab value="changes">Changes</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="changes" pt="sm">
                {changes && changes.files?.length ? (
                  <Stack>
                    {changes.files.map((f, idx) => {
                      const cleaned = cleanDiffContent(f.diff || '');
                      const originalLines = cleaned.split('\n');
                      const display = originalLines.map(ln => (ln.startsWith('+') || ln.startsWith('-') ? ln.slice(1) : ln)).join('\n');
                      return (
                        <Card key={`${f.path}-${idx}`} withBorder>
                          <Group justify="space-between" mb={8}>
                            <Text fw={600}>{f.path}</Text>
                            <Badge variant="light">{f.change_type}</Badge>
                          </Group>
                          {cleaned ? (
                            <SyntaxHighlighter
                              language={getLanguageFromPath(f.path)}
                              style={oneDark}
                              showLineNumbers
                              wrapLongLines
                              lineNumberStyle={{ color: '#666', fontSize: '12px' }}
                              customStyle={{ margin: 0, padding: '12px', background: 'var(--mantine-color-dark-6)' }}
                              lineProps={(lineNumber: number) => {
                                const line = originalLines[lineNumber - 1] || '';
                                if (line.startsWith('+')) return { style: { backgroundColor: 'rgba(40, 167, 69, 0.2)' } };
                                if (line.startsWith('-')) return { style: { backgroundColor: 'rgba(220, 53, 69, 0.2)' } };
                                return {};
                              }}
                            >
                              {display}
                            </SyntaxHighlighter>
                          ) : (
                            <Text size="sm" c="dimmed">Нет изменений</Text>
                          )}
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">Нет изменений</Text>
                )}
              </Tabs.Panel>
            </Tabs>
            <Divider label="Комментарии" labelPosition="center" my="sm"/>
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

function cleanDiffContent(rawDiff: string): string {
  if (!rawDiff) return '';
  const lines = rawDiff.split('\n');
  const cleanLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('+++') || line.startsWith('---') || line.match(/^@@.*@@/)) {
      continue;
    }
    if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
      cleanLines.push(line);
    }
  }
  return cleanLines.join('\n');
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', rb: 'ruby', php: 'php',
    java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', sh: 'bash', yml: 'yaml', yaml: 'yaml',
    json: 'json', xml: 'xml', html: 'html', css: 'css', scss: 'scss', sql: 'sql', md: 'markdown', dockerfile: 'dockerfile'
  };
  return map[ext] || 'text';
}


