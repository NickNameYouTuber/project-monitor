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
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [estimateMinutes, setEstimateMinutes] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [repoList, setRepoList] = useState<{ id: string; name: string }[]>([]);
  const [branchesByRepo, setBranchesByRepo] = useState<Record<string, string[]>>({});
  const [selectedBranchVal, setSelectedBranchVal] = useState<string | null>(null); // `${repoId}::${branch}` or null
  const [branchQuery, setBranchQuery] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [pendingBranchName, setPendingBranchName] = useState('');
  const [repoForCreate, setRepoForCreate] = useState<string | null>(null);
  const [baseBranch, setBaseBranch] = useState<string | null>(null);
  const [savingBranch, setSavingBranch] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setAssigneeIds(task.assignees?.map((a) => a.id) || []);
    setReviewerId(task.reviewer_id || null);
    setDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0,16) : null);
    setEstimateMinutes(task.estimate_minutes != null ? String(task.estimate_minutes) : '');
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

        // Репозитории и ветки (компактный список repo:branch)
        const pr = await fetchProjectRepositories(task.project_id);
        const repos = pr.map(r => ({ id: r.id, name: r.name }));
        setRepoList(repos);
        const map: Record<string, string[]> = {};
        for (const r of repos) {
          try {
            const bs = await listBranches(r.id);
            map[r.id] = bs.map(b => b.name);
          } catch {}
        }
        setBranchesByRepo(map);
        // Выбираем существующую связанную ветку, если есть
        const related = await getTaskBranches(task.id).catch(() => []);
        if (Array.isArray(related) && related.length > 0) {
          const repoMatch = repos.find(r => r.name === related[0].repository_name);
          if (repoMatch) {
            setSelectedBranchVal(`${repoMatch.id}::${related[0].branch_name}`);
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
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        estimate_minutes: estimateMinutes.trim() ? parseInt(estimateMinutes, 10) : null,
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

  const branchOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const r of repoList) {
      const bs = branchesByRepo[r.id] || [];
      for (const b of bs) {
        opts.push({ value: `${r.id}::${b}`, label: `${r.name}: ${b}` });
      }
    }
    const q = branchQuery.trim();
    if (q) {
      const exists = opts.some(o => o.label.toLowerCase().endsWith(`: ${q.toLowerCase()}`));
      if (!exists) {
        opts.unshift({ value: `__create__:${q}`, label: `Создать ветку "${q}"` });
      }
    }
    return opts;
  }, [repoList, branchesByRepo, branchQuery]);

  async function handleBranchChange(val: string | null) {
    if (!task) { setSelectedBranchVal(val); return; }
    if (val && val.startsWith('__create__:')) {
      const name = val.replace('__create__:', '');
      setCreateMode(true);
      setPendingBranchName(name);
      const firstRepo = repoList[0]?.id || null;
      setRepoForCreate(firstRepo);
      if (firstRepo) {
        const bs = await listBranches(firstRepo);
        setBranchesByRepo(prev => ({ ...prev, [firstRepo]: bs.map(b => b.name) }));
        setBaseBranch(bs.find(b => b.is_default)?.name || bs[0]?.name || null);
      }
      setSelectedBranchVal(null);
      return;
    }
    setSelectedBranchVal(val);
    if (!val) return;
    const [repoId, branch] = val.split('::');
    setSavingBranch(true);
    try {
      await attachBranch(task.id, repoId, branch);
    } finally {
      setSavingBranch(false);
    }
  }

  async function confirmCreateAndAttach() {
    if (!task || !repoForCreate || !pendingBranchName.trim()) return;
    setSavingBranch(true);
    try {
      await createBranch(repoForCreate, pendingBranchName.trim(), baseBranch || undefined, task.id);
      const bs = await listBranches(repoForCreate);
      setBranchesByRepo(prev => ({ ...prev, [repoForCreate]: bs.map(b => b.name) }));
      setSelectedBranchVal(`${repoForCreate}::${pendingBranchName.trim()}`);
      setCreateMode(false);
      setPendingBranchName('');
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
          <Stack>
            <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
            <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} minRows={3} />
            <MultiSelect label="Исполнители" data={members} value={assigneeIds} onChange={setAssigneeIds} searchable placeholder="Выберите участников" nothingFoundMessage="Нет участников" />
            <Select label="Ревьюер" data={[{ value: '', label: '—' }, ...members]} value={reviewerId ?? ''} onChange={(v) => setReviewerId(v || null)} searchable allowDeselect />
            <Group grow>
              <TextInput
                label="Дедлайн"
                type="datetime-local"
                value={dueDate ?? ''}
                onChange={(e) => setDueDate(e.currentTarget.value || null)}
              />
              <TextInput label="Оценка, мин" value={estimateMinutes} onChange={(e) => setEstimateMinutes(e.currentTarget.value.replace(/[^0-9]/g, ''))} placeholder="Напр. 90" />
            </Group>
            {/* Ветка прямо под ревьюером */}
            <Select
              label="Ветка"
              data={branchOptions}
              value={selectedBranchVal}
              onChange={handleBranchChange}
              searchable
              searchValue={branchQuery}
              onSearchChange={setBranchQuery}
              nothingFoundMessage={branchQuery ? 'Создайте новую ветку' : 'Нет веток'}
            />
            {createMode && (
              <>
                <Text size="sm" c="dimmed">Будет создана ветка: {pendingBranchName}</Text>
                <Group grow>
                  <Select
                    label="Репозиторий"
                    data={repoList.map(r => ({ value: r.id, label: r.name }))}
                    value={repoForCreate}
                    onChange={async (repoId) => {
                      setRepoForCreate(repoId);
                      if (repoId) {
                        const bs = await listBranches(repoId);
                        setBranchesByRepo(prev => ({ ...prev, [repoId]: bs.map(b => b.name) }));
                        setBaseBranch(bs.find(b => b.is_default)?.name || bs[0]?.name || null);
                      }
                    }}
                    searchable
                  />
                  <Select
                    label="Базовая ветка"
                    data={(repoForCreate ? (branchesByRepo[repoForCreate] || []) : []).map(b => ({ value: b, label: b }))}
                    value={baseBranch}
                    onChange={setBaseBranch}
                    searchable
                  />
                </Group>
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setCreateMode(false)}>Отмена</Button>
                  <Button onClick={confirmCreateAndAttach} loading={savingBranch} disabled={!repoForCreate || !pendingBranchName.trim()}>Создать и привязать</Button>
                </Group>
              </>
            )}
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


