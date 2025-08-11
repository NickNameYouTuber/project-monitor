import { useEffect, useMemo, useState } from 'react';
import { Button, Group, Loader, Modal, MultiSelect, Select, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';
import { fetchProject } from '../../api/projects';
import apiClient from '../../api/client';
import { createComment, getTaskComments, type Comment } from '../../api/comments';

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
        if (p.dashboard_id) {
          const { data } = await apiClient.get(`/dashboards/${p.dashboard_id}/members`);
          const options = (data || []).map((m: any) => ({ value: m.user_id, label: m.user?.username || m.username || m.user_id }));
          setMembers(options);
        } else {
          setMembers([]);
        }
        const cs = await getTaskComments(task.id);
        setComments(Array.isArray(cs) ? cs : []);
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
                    <Text size="sm" c="dimmed">{new Date(c.created_at).toLocaleString()} • {c.username}</Text>
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


