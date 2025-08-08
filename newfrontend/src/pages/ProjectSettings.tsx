import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Group, Select, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { deleteProject, fetchProject, updateProject, type Project } from '../api/projects';
import apiClient from '../api/client';

type Member = { id: string; user: { id: string; username: string; first_name?: string | null; last_name?: string | null }; role: string };

export default function ProjectSettings({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'inPlans' | 'inProgress' | 'onPause' | 'completed'>('inPlans');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const p = await fetchProject(projectId);
        if (!mounted) return;
        setProject(p);
        setName(p.name);
        setDescription(p.description || '');
        setStatus(p.status);
        setPriority(p.priority);
        if (p.dashboard_id) {
          const { data } = await apiClient.get<Member[]>(`/dashboards/${p.dashboard_id}/members`);
          if (mounted) setMembers(data);
        } else {
          setMembers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [projectId]);

  async function handleSave() {
    if (!project) return;
    setLoading(true);
    try {
      await updateProject(project.id, { name: name.trim(), description: description.trim(), status, priority });
      const updated = await fetchProject(project.id);
      setProject(updated);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    if (!confirm('Удалить проект? Действие необратимо.')) return;
    setLoading(true);
    try {
      await deleteProject(project.id);
      window.location.assign(`/dashboards/${project.dashboard_id || ''}`);
    } finally {
      setLoading(false);
    }
  }

  async function addMemberByTelegram(telegramId: string, role: string) {
    if (!project?.dashboard_id) return;
    const { data } = await apiClient.post<Member>(`/dashboards/${project.dashboard_id}/invite-by-telegram`, { telegram_id: Number(telegramId), role });
    setMembers((prev) => [data, ...prev]);
  }

  async function removeMember(memberId: string) {
    if (!project?.dashboard_id) return;
    await apiClient.delete(`/dashboards/${project.dashboard_id}/members/${memberId}`);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  const roleOptions = useMemo(() => [
    { value: 'viewer', label: 'Viewer' },
    { value: 'editor', label: 'Editor' },
    { value: 'admin', label: 'Admin' },
  ], []);

  if (loading && !project) return <Text>Загрузка…</Text>;
  if (!project) return <Text c="red">Проект не найден</Text>;

  return (
    <Stack>
      <Title order={4}>Настройки проекта</Title>
      <Card withBorder padding="md">
        <Text fw={600} mb={8}>Основное</Text>
        <TextInput label="Название" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
        <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} mt="sm" />
        <Group grow mt="sm">
          <Select label="Статус" data={[
            { value: 'inPlans', label: 'В планах' },
            { value: 'inProgress', label: 'В работе' },
            { value: 'onPause', label: 'Пауза' },
            { value: 'completed', label: 'Завершён' },
          ]} value={status} onChange={(v) => v && setStatus(v as any)} />
          <Select label="Приоритет" data={[
            { value: 'high', label: 'Высокий' },
            { value: 'medium', label: 'Средний' },
            { value: 'low', label: 'Низкий' },
          ]} value={priority} onChange={(v) => v && setPriority(v as any)} />
        </Group>
        <Group justify="flex-end" mt="md">
          <Button variant="default" color="red" onClick={handleDelete}>Удалить проект</Button>
          <Button onClick={handleSave} loading={loading}>Сохранить</Button>
        </Group>
      </Card>

      <Card withBorder padding="md">
        <Text fw={600} mb={8}>Участники дашборда (доступ к проекту)</Text>
        <Stack gap="xs">
          {members.map((m) => (
            <Group key={m.id} wrap="nowrap">
              <Text w={220}>{m.user.first_name || ''} {m.user.last_name || ''} ({m.user.username})</Text>
              <Select w={180} data={roleOptions} value={m.role} onChange={async (v) => {
                if (!v) return; // Simplification: could add role update route in backend
              }} disabled />
              <Button variant="default" onClick={() => removeMember(m.id)}>Удалить</Button>
            </Group>
          ))}
          {members.length === 0 && <Text c="dimmed">Пока нет участников</Text>}
        </Stack>
        <Group mt="md" align="flex-end">
          <TextInput label="Telegram ID" placeholder="Например, 123456789" id="tg-id" />
          <Select label="Роль" data={roleOptions} defaultValue="viewer" id="tg-role" />
          <Button onClick={() => {
            const id = (document.getElementById('tg-id') as HTMLInputElement)?.value;
            const role = (document.getElementById('tg-role') as HTMLSelectElement)?.value;
            if (id) void addMemberByTelegram(id, role || 'viewer');
          }}>Добавить по Telegram ID</Button>
        </Group>
      </Card>
    </Stack>
  );
}


