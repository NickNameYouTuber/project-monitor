import { useState } from 'react';
import { Button, Group, Select, Stack, Textarea, TextInput, Title } from '@mantine/core';
import { createRepository } from '../api/repositories';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function RepositoryCreate() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const projectId = search.get('projectId') || '';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public' | 'internal'>('private');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const repo = await createRepository({ name: name.trim(), description: description.trim() || undefined, visibility, project_id: projectId || undefined });
      navigate(`/repositories/${repo.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack>
      <Title order={3}>Создать репозиторий</Title>
      <TextInput label="Название" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
      <Textarea label="Описание" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
      <Select label="Видимость" data={[{ value: 'private', label: 'Private' }, { value: 'internal', label: 'Internal' }, { value: 'public', label: 'Public' }]} value={visibility} onChange={(v) => v && setVisibility(v as any)} />
      <Group justify="flex-end">
        <Button variant="default" onClick={() => navigate(-1)}>Отмена</Button>
        <Button onClick={handleCreate} loading={loading} disabled={!name.trim()}>Создать</Button>
      </Group>
    </Stack>
  );
}


