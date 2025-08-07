import { useState } from 'react';
import { Modal, Stack, TextInput, Group, Button } from '@mantine/core';
import { useTaskBoard } from '../../context/TaskBoardContext';

export default function TaskColumnForm({ onClose }: { onClose: () => void }) {
  const { addColumn } = useTaskBoard();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <Modal opened onClose={onClose} title="Новая колонка" centered>
      <Stack>
        <TextInput label="Название" value={name} onChange={(e) => setName(e.currentTarget.value)} autoFocus />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button loading={loading} disabled={!name.trim()} onClick={async () => {
            setLoading(true);
            try {
              await addColumn(name.trim());
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


