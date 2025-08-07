import { useState } from 'react';
import { Modal, Stack, TextInput, Textarea, Group, Button } from '@mantine/core';

export default function TaskForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (title: string, description?: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <Modal opened onClose={onClose} title="Новая задача" centered>
      <Stack>
        <TextInput label="Заголовок" value={title} onChange={(e) => setTitle(e.currentTarget.value)} autoFocus />
        <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} minRows={3} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button loading={loading} disabled={!title.trim()} onClick={async () => {
            setLoading(true);
            try {
              await onSubmit(title.trim(), description.trim() || undefined);
              onClose();
            } finally {
              setLoading(false);
            }
          }}>Создать</Button>
        </Group>
      </Stack>
    </Modal>
  );
}


