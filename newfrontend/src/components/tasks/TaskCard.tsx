import { Draggable } from '@hello-pangea/dnd';
import { Card, Group, Menu, Text, ActionIcon, Button, Modal, Stack, Select, TextInput, Badge } from '@mantine/core';
import type { Task } from '../../api/tasks';
import { useState } from 'react';
import TaskForm from './TaskForm';
import { fetchProject } from '../../api/projects';
import { fetchProjectRepositories, listBranches, createBranch } from '../../api/repositories';
import { attachBranch } from '../../api/taskRepository';
import { useTaskBoard } from '../../context/TaskBoardContext';

export default function TaskCard({ task, index }: { task: Task; index: number }) {
  const { setSelectedTask } = useTaskBoard();
  const [openEdit, setOpenEdit] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [repos, setRepos] = useState<{ value: string; label: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [newBranch, setNewBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function openBranchModal() {
    setOpenBranch(true);
    setLoading(true);
    try {
      const project = await fetchProject(task.project_id);
      if (project?.id) {
        const pr = await fetchProjectRepositories(project.id);
        setRepos(pr.map(r => ({ value: r.id, label: r.name })));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRepoChange(repoId: string | null) {
    setSelectedRepo(repoId);
    setSelectedBranch(null);
    setBranches([]);
    if (repoId) {
      const bs = await listBranches(repoId);
      setBranches(bs.map(b => ({ value: b.name, label: b.name })));
      setBaseBranch(bs.find(b => b.is_default)?.name || bs[0]?.name || null);
    }
  }

  async function submitBranch() {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      if (selectedBranch) {
        await attachBranch(task.id, selectedRepo, selectedBranch);
      } else if (newBranch.trim()) {
        await createBranch(selectedRepo, newBranch.trim(), baseBranch || undefined, task.id);
      }
      setOpenBranch(false);
      setSelectedRepo(null);
      setSelectedBranch(null);
      setNewBranch('');
    } finally {
      setLoading(false);
    }
  }
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided: any) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <Card withBorder padding="sm" shadow="xs" onClick={() => setSelectedTask(task)}>
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={500}>{task.title}</Text>
                {(task.estimate_hours || task.due_date) && (
                  <Group gap={6} mt={4} wrap="nowrap">
                    {task.estimate_hours ? <Badge variant="light" size="xs">⏱ {task.estimate_hours}ч</Badge> : null}
                    {task.due_date ? <Badge variant="light" size="xs">📅 {new Date(task.due_date).toLocaleDateString()}</Badge> : null}
                  </Group>
                )}
                {task.description && (
                  <Text size="sm" c="dimmed" mt={4}>
                    {task.description}
                  </Text>
                )}
              </div>
              <Menu withinPortal position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" aria-label="Настройки задачи" onClick={(e) => e.stopPropagation()}>⋮</ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={(e) => { e.stopPropagation(); setOpenEdit(true); }}>Редактировать</Menu.Item>
                  <Menu.Item onClick={(e) => { e.stopPropagation(); openBranchModal(); }}>Ветка: создать/привязать</Menu.Item>
                  <Menu.Item color="red">Удалить</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
            <TaskForm projectId={task.project_id} opened={openEdit} onClose={() => setOpenEdit(false)} task={task} />
          <Modal opened={openBranch} onClose={() => setOpenBranch(false)} title="Ветка для задачи" centered>
            <Stack>
              <Select label="Репозиторий" data={repos} value={selectedRepo} onChange={onRepoChange} searchable nothingFoundMessage="Нет репозиториев" disabled={loading} />
              <Select label="Существующая ветка" data={branches} value={selectedBranch} onChange={setSelectedBranch} searchable clearable nothingFoundMessage="Нет веток" disabled={loading || !selectedRepo} />
              <Text size="sm" c="dimmed">или</Text>
              <TextInput label="Новая ветка" value={newBranch} onChange={(e) => setNewBranch(e.currentTarget.value)} placeholder="feature/task-123" disabled={loading || !selectedRepo} />
              <Select label="Базовая ветка" data={branches} value={baseBranch} onChange={setBaseBranch} searchable disabled={loading || !selectedRepo || !newBranch.trim()} />
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setOpenBranch(false)}>Отмена</Button>
                <Button onClick={submitBranch} loading={loading} disabled={!selectedRepo || (!selectedBranch && !newBranch.trim())}>Сохранить</Button>
              </Group>
            </Stack>
          </Modal>
          </Card>
        </div>
      )}
    </Draggable>
  );
}


