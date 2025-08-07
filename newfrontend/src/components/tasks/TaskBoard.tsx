import { useEffect, useMemo, useState } from 'react';
import { Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { fetchProjectColumns, fetchProjectTasks, type Task, type TaskColumn } from '../../api/taskBoard';

interface TaskBoardProps {
  projectId: string;
}

export default function TaskBoard({ projectId }: TaskBoardProps) {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [c, t] = await Promise.all([
          fetchProjectColumns(projectId),
          fetchProjectTasks(projectId),
        ]);
        if (mounted) {
          setColumns(c);
          setTasks(t);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const column of columns) map[column.id] = [];
    for (const task of tasks) {
      if (!map[task.column_id]) map[task.column_id] = [];
      map[task.column_id].push(task);
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.order - b.order);
    return map;
  }, [columns, tasks]);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack>
      <Title order={4}>Доска задач</Title>
      <div style={{ overflowX: 'auto' }}>
        <Group wrap="nowrap" align="flex-start">
          {columns
            .sort((a, b) => a.order - b.order)
            .map((column) => (
              <Card key={column.id} withBorder shadow="sm" padding="md" style={{ minWidth: 300 }}>
                <Text fw={600}>{column.name}</Text>
                <Stack mt="sm">
                  {tasksByColumn[column.id]?.map((task) => (
                    <Card key={task.id} withBorder padding="sm">
                      <Text fw={500}>{task.title}</Text>
                      {task.description && (
                        <Text c="dimmed" size="sm">{task.description}</Text>
                      )}
                    </Card>
                  ))}
                </Stack>
              </Card>
            ))}
        </Group>
      </div>
    </Stack>
  );
}


