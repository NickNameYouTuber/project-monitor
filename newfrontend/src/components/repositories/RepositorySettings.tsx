import { useEffect, useState } from 'react';
import { Button, Group, Stack, TextInput, Textarea, Select, Card, Text } from '@mantine/core';
import { deleteRepository, fetchCloneInfo, type CloneInfo, updateRepository } from '../../api/repositories';

export default function RepositorySettings({ repositoryId, name: initialName, description: initialDesc, visibility: initialVis, onUpdated }: { repositoryId: string; name: string; description?: string | null; visibility?: 'public' | 'private' | 'internal'; onUpdated?: () => void }) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDesc || '');
  const [visibility, setVisibility] = useState(initialVis || 'private');
  const [loading, setLoading] = useState(false);
  const [cloneInfo, setCloneInfo] = useState<CloneInfo | null>(null);

  useEffect(() => {
    fetchCloneInfo(repositoryId).then(setCloneInfo).catch(() => setCloneInfo(null));
  }, [repositoryId]);

  async function handleSave() {
    setLoading(true);
    try {
      await updateRepository(repositoryId, { name: name.trim(), description: description.trim(), visibility });
      onUpdated?.();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить репозиторий?')) return;
    setLoading(true);
    try {
      await deleteRepository(repositoryId);
      window.location.assign('/repositories');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack>
      <Card withBorder padding="md">
        <Text fw={600} mb={8}>Настройки репозитория</Text>
        <TextInput label="Название" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
        <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} mt="sm" />
        <Select label="Видимость" mt="sm" data={[{ value: 'private', label: 'Private' }, { value: 'internal', label: 'Internal' }, { value: 'public', label: 'Public' }]} value={visibility} onChange={(v) => v && setVisibility(v as any)} />
        <Group justify="flex-end" mt="md">
          <Button variant="default" color="red" onClick={handleDelete} loading={loading}>Удалить</Button>
          <Button onClick={handleSave} loading={loading}>Сохранить</Button>
        </Group>
      </Card>

      {cloneInfo && (
        <Card withBorder padding="md">
          <Text fw={600} mb={8}>Клонирование</Text>
          {cloneInfo.clone_instructions?.https && (
            <pre>{cloneInfo.clone_instructions.https}</pre>
          )}
          {cloneInfo.clone_instructions?.ssh && (
            <pre>{cloneInfo.clone_instructions.ssh}</pre>
          )}
          {cloneInfo.clone_instructions?.setup && (
            <pre>{cloneInfo.clone_instructions.setup}</pre>
          )}
        </Card>
      )}
    </Stack>
  );
}


