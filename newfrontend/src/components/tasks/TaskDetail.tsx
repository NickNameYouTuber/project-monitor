import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Loader, Modal, MultiSelect, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { fetchProject } from '../../api/projects';
import apiClient from '../../api/client';
import { createComment, getTaskComments, type Comment } from '../../api/comments';
import { fetchProjectRepositories, listBranches, createBranch } from '../../api/repositories';
import { attachBranch, getTaskBranches } from '../../api/taskRepository';

export default function TaskDetail() {
  const { selectedTask, setSelectedTask, updateTask } = useTaskBoard();
  const task = selectedTask;
  const opened = Boolean(task);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ value: string; label: string }[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [repos, setRepos] = useState<{ value: string; label: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchQuery, setBranchQuery] = useState('');
  const [baseBranch, setBaseBranch] = useState<string | null>(null);
  const [savingBranch, setSavingBranch] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setAssigneeIds(task.assignees?.map((a) => a.id) || []);
    setReviewerId(task.reviewer_id || null);
    setComments([]);
  }, [task]);

  useEffect(() => {
    async function loadMembersAndComments() {
      if (!task) return;
      try {
        setLoading(true);
        const p = await fetchProject(task.project_id);
        const me = await apiClient.get('/users/me').then(r => r.data).catch(() => null);
        if (me?.id) setMeId(me.id);
        if (p.dashboard_id) {
          const { data } = await apiClient.get(`/dashboards/${p.dashboard_id}/members`);
          const options = (data || []).map((m: any) => {
            const id = m.user_id;
            const name = m.user?.username || m.username || m.user_id;
            const label = me && id === me.id ? `${name} (Вы)` : name;
            return { value: id, label };
          });
          // всегда включаем текущего пользователя (если его нет в участниках)
          if (me) {
            const exists = options.find((o: { value: string }) => o.value === me.id);
            if (!exists) options.unshift({ value: me.id, label: `${me.username} (Вы)` });
          }
          setMembers(options);
        } else {
          setMembers([]);
        }
        const cs = await getTaskComments(task.id);
        setComments(Array.isArray(cs) ? cs : []);

        // Репозитории и ветки
        const pr = await fetchProjectRepositories(task.project_id);
        const reposOpts = pr.map(r => ({ value: r.id, label: r.name }));
        setRepos(reposOpts);
        // Если есть привязанные ветки, можно подтянуть первую как выбранную
        const related = await getTaskBranches(task.id).catch(() => []);
        if (Array.isArray(related) && related.length > 0) {
          const repoMatch = reposOpts.find(r => r.label === related[0].repository_name);
          if (repoMatch) {
            setSelectedRepo(repoMatch.value);
            const bs = await listBranches(repoMatch.value);
            setBranches(bs.map(b => ({ value: b.name, label: b.name })));
            setSelectedBranch(related[0].branch_name || null);
            setBaseBranch(bs.find(b => b.is_default)?.name || bs[0]?.name || null);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    if (opened) void loadMembersAndComments();
  }, [opened, task]);

  const timeline = useMemo(() => {
    return [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments]);

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        assignee_ids: assigneeIds,
        reviewer_id: reviewerId,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment() {
    if (!task || !newComment.trim()) return;
    const created = await createComment({ task_id: task.id, content: newComment.trim() });
    setComments((prev) => [...prev, created]);
    setNewComment('');
  }

  async function onRepoChange(repoId: string | null) {
    setSelectedRepo(repoId);
    setSelectedBranch(null);
    setBranches([]);
    if (repoId) {
      const bs = await listBranches(repoId);
      setBranches(bs.map(b => ({ value: b.name, label: b.name })));
      setBaseBranch(bs.find(b => b.is_default)?.name || bs[0]?.name || null);
    }
  }

  async function handleSaveBranch() {
    if (!task || !selectedRepo) return;
    setSavingBranch(true);
    try {
      if (selectedBranch) {
        await attachBranch(task.id, selectedRepo, selectedBranch);
      }
    } finally {
      setSavingBranch(false);
    }
  }

  return (
    <Modal opened={opened} onClose={() => setSelectedTask(null)} title={task ? `Задача: ${task.title}` : ''} size="xl" centered>
      {!task ? (
        <Group justify="center"><Loader /></Group>
      ) : (
        <Stack gap="lg">
          {/* Ветка задачи — над комментариями */}
          <Stack>
            <Text fw={600}>Ветка задачи</Text>
            <Group grow>
              <Select label="Репозиторий" data={repos} value={selectedRepo} onChange={onRepoChange} searchable nothingFoundMessage="Нет репозиториев" />
              <Select
                label="Ветка"
                data={(function() {
                  const exists = branches.some(b => b.label.toLowerCase() === branchQuery.toLowerCase());
                  const createOpt = branchQuery && !exists ? [{ value: `__create__:${branchQuery}`, label: `Создать ветку "${branchQuery}"` }] : [];
                  return [...createOpt, ...branches];
                })()}
                value={selectedBranch}
                onChange={async (val) => {
                  if (!task || !selectedRepo) { setSelectedBranch(val); return; }
                  if (val && val.startsWith('__create__:')) {
                    const name = val.replace('__create__:', '');
                    setSavingBranch(true);
                    try {
                      await createBranch(selectedRepo, name, baseBranch || undefined, task.id);
                      const item = { value: name, label: name };
                      setBranches((current) => [item, ...current]);
                      setSelectedBranch(name);
                    } finally {
                      setSavingBranch(false);
                    }
                  } else {
                    setSelectedBranch(val);
                  }
                }}
                searchable
                searchValue={branchQuery}
                onSearchChange={setBranchQuery}
                disabled={!selectedRepo}
                nothingFoundMessage={selectedRepo ? 'Нет веток' : 'Сначала выберите репозиторий'}
              />
            </Group>
            <Group grow>
              <Select label="Базовая ветка" data={branches} value={baseBranch} onChange={setBaseBranch} searchable disabled={!selectedRepo} />
              <div />
            </Group>
            <Group justify="flex-end">
              <Button onClick={handleSaveBranch} loading={savingBranch} disabled={!selectedRepo || !selectedBranch}>Привязать ветку</Button>
            </Group>
          </Stack>

          <Stack>
            <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
            <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} minRows={3} />
            <MultiSelect label="Исполнители" data={members} value={assigneeIds} onChange={setAssigneeIds} searchable placeholder="Выберите участников" nothingFoundMessage="Нет участников" />
            <Select label="Ревьюер" data={[{ value: '', label: '—' }, ...members]} value={reviewerId ?? ''} onChange={(v) => setReviewerId(v || null)} searchable allowDeselect />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setSelectedTask(null)}>Закрыть</Button>
              <Button onClick={handleSave} loading={saving}>Сохранить</Button>
            </Group>
          </Stack>

          <Stack>
            <Text fw={600}>Комментарии и события</Text>
            <Stack>
              {timeline.map((c) => (
                <div key={c.id} style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, padding: 10, background: c.is_system ? 'rgba(125,125,125,0.06)' : 'transparent' }}>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">{new Date(c.created_at).toLocaleString()} • {c.username}{meId && c.user_id === meId ? ' (Вы)' : ''}</Text>
                    {c.is_system && <Text size="xs" c="dimmed">system</Text>}
                  </Group>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{c.content}</Text>
                </div>
              ))}
            </Stack>
            <Textarea placeholder="Оставить комментарий" value={newComment} onChange={(e) => setNewComment(e.currentTarget.value)} minRows={2} />
            <Group justify="flex-end">
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>Отправить</Button>
            </Group>
          </Stack>
        </Stack>
      )}
    </Modal>
  );
}


