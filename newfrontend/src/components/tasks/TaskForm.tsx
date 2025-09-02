import { Button, Group, Modal, MultiSelect, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';
import type { Task } from '../../api/tasks';
import { useEffect, useState } from 'react';
import { fetchProject } from '../../api/projects';
import apiClient from '../../api/client';

export default function TaskForm({ projectId, columnId, opened, onClose, task }: { projectId: string; columnId?: string; opened: boolean; onClose: () => void; task?: Task }) {
  const { addTask, updateTask } = useTaskBoard();
  const isEdit = Boolean(task);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (isEdit && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setAssigneeIds(task.assignees?.map(a => a.id) || []);
      setReviewerId(task.reviewer_id || null);
    } else {
      setTitle('');
      setDescription('');
      setAssigneeIds([]);
      setReviewerId(null);
    }
  }, [isEdit, task, opened]);

  useEffect(() => {
    async function loadMembers() {
      try {
        const p = await fetchProject(projectId);
        if (p.dashboard_id) {
          const { data } = await apiClient.get(`/dashboards/${p.dashboard_id}/members`);
          const options = (data || []).map((m: any) => ({ value: m.user_id, label: m.user?.username || m.username || m.user_id }));
          setMembers(options);
        } else {
          setMembers([]);
        }
      } catch (e) {
        setMembers([]);
      }
    }
    if (opened) void loadMembers();
  }, [opened, projectId]);

  async function handleSubmit() {
    setLoading(true);
    try {
      if (isEdit && task) {
        await updateTask(task.id, { title: title.trim(), description: description.trim(), assignee_ids: assigneeIds, reviewer_id: reviewerId });
      } else if (columnId) {
        await addTask({ title: title.trim(), description: description.trim() || undefined, column_id: columnId, assignee_ids: assigneeIds, reviewer_id: reviewerId });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Редактировать задачу' : 'Новая задача'} centered>
      <Stack>
        <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required autoFocus />
        <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <MultiSelect label="Исполнители" data={members} value={assigneeIds} onChange={setAssigneeIds} searchable placeholder="Выберите участников" nothingFoundMessage="Нет участников" />
        <Select label="Ревьюер" data={[{ value: '', label: '—' }, ...members]} value={reviewerId ?? ''} onChange={(v) => setReviewerId(v || null)} searchable allowDeselect />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!title.trim()}>{isEdit ? 'Сохранить' : 'Создать'}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}


