import { useEffect, useState } from 'react';
import { Button, Group, Modal, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { createProject, type ProjectPriority, type ProjectStatus } from '../../api/projects';

interface ProjectModalProps {
  opened: boolean;
  onClose: () => void;
  dashboardId?: string;
}

export default function ProjectModal({ opened, onClose, dashboardId }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('Team');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [status, setStatus] = useState<ProjectStatus>('inPlans');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      setName('');
      setDescription('');
      setAssignee('Team');
      setPriority('medium');
      setStatus('inPlans');
    }
  }, [opened]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProject({
        name,
        description,
        assignee,
        priority,
        status,
        order: 1000,
        dashboard_id: dashboardId,
      });
      notifications.show({ color: 'green', title: 'Успех', message: 'Проект создан' });
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Не удалось создать проект';
      notifications.show({ color: 'red', title: 'Ошибка', message });
    } finally {
      setLoading(false);
    }
  };

  const priorityData = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const statusData = [
    { value: 'inPlans', label: 'In Plans' },
    { value: 'inProgress', label: 'In Progress' },
    { value: 'onPause', label: 'On Pause' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={600}>Новый проект</Text>} centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Название"
            placeholder="Введите название"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
            data-autofocus
          />
          <Textarea
            label="Описание"
            placeholder="Краткое описание"
            minRows={4}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          <Select
            label="Ответственный"
            placeholder="Выберите"
            data={[{ value: 'Team', label: 'Team' }]}
            value={assignee}
            onChange={(value) => setAssignee(value || 'Team')}
          />
          <Select
            label="Приоритет"
            data={priorityData}
            value={priority}
            onChange={(value) => setPriority((value as ProjectPriority) || 'medium')}
          />
          <Select
            label="Статус"
            data={statusData}
            value={status}
            onChange={(value) => setStatus((value as ProjectStatus) || 'inPlans')}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" loading={loading}>
              Создать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}


