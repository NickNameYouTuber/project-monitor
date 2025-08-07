import { useEffect, useState } from 'react';
import { Button, Group, Modal, Textarea, TextInput } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';
import type { Task } from '../../api/tasks';

export default function TaskForm({ projectId, columnId, opened, onClose, task }: { projectId: string; columnId?: string; opened: boolean; onClose: () => void; task?: Task }) {
  const { addTask, updateTask } = useTaskBoard();
  const isEdit = Boolean(task);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [isEdit, task, opened]);

  async function handleSubmit() {
    setLoading(true);
    try {
      if (isEdit && task) {
        await updateTask(task.id, { title: title.trim(), description: description.trim() });
      } else if (columnId) {
        await addTask({ title: title.trim(), description: description.trim() || undefined, column_id: columnId, project_id: projectId });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Редактировать задачу' : 'Новая задача'} centered>
      <TextInput label="Название" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required autoFocus />
      <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} mt="sm" />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>Отмена</Button>
        <Button onClick={handleSubmit} loading={loading} disabled={!title.trim()}>{isEdit ? 'Сохранить' : 'Создать'}</Button>
      </Group>
    </Modal>
  );
}


