import { useState } from 'react';
import { Button, Group, Modal, Textarea, TextInput } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';

export default function TaskForm({ projectId, columnId, opened, onClose }: { projectId: string; columnId: string; opened: boolean; onClose: () => void }) {
  const { addTask } = useTaskBoard();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      await addTask({ title: title.trim(), description: description.trim() || undefined, column_id: columnId, project_id: projectId });
      setTitle('');
      setDescription('');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Новая задача" centered>
      <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required autoFocus />
      <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} mt="sm" />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>Отмена</Button>
        <Button onClick={handleCreate} loading={loading} disabled={!title.trim()}>Создать</Button>
      </Group>
    </Modal>
  );
}


