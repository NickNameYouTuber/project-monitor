import { useState } from 'react';
import { Button, Group, Modal, Select, Stack, TextInput } from '@mantine/core';
import { createBranch, type GitBranch } from '../../api/repositories';

export default function BranchActions({ repositoryId, branches, currentBranch, onCreated }: { repositoryId: string; branches: GitBranch[]; currentBranch?: string; onCreated?: (name: string) => void }) {
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState('');
  const [base, setBase] = useState<string | null>(currentBranch || null);
  const canCreate = name.trim().length > 1;

  async function submit() {
    const res = await createBranch(repositoryId, name.trim(), base || undefined);
    if (res?.success) {
      onCreated?.(name.trim());
      setOpened(false);
      setName('');
    }
  }

  return (
    <>
      <Button variant="light" onClick={() => setOpened(true)}>Создать ветку</Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Новая ветка" centered>
        <Stack>
          <TextInput label="Имя ветки" value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="feature/my-branch" autoFocus />
          <Select label="Базовая ветка" data={branches.map(b => ({ value: b.name, label: b.name }))} value={base} onChange={setBase} searchable />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>Отмена</Button>
            <Button onClick={submit} disabled={!canCreate}>Создать</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}


