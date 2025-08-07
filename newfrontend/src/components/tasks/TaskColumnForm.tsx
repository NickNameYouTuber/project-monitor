import { useState } from 'react';
import { Button, Group, Modal, TextInput } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';

export default function TaskColumnForm({ projectId, opened, onClose }: { projectId: string; opened: boolean; onClose: () => void }) {
  const { addColumn } = useTaskBoard();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      await addColumn({ name: name.trim(), project_id: projectId });
      setName('');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Новая колонка" centered>
      <TextInput label="Название" value={name} onChange={(e) => setName(e.currentTarget.value)} required autoFocus />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>Отмена</Button>
        <Button onClick={handleCreate} loading={loading} disabled={!name.trim()}>Создать</Button>
      </Group>
    </Modal>
  );
}


