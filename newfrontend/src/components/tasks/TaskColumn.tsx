import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Card, Group, Stack, Text, Button, ActionIcon, Menu } from '@mantine/core';
import { useState } from 'react';
import TaskForm from './TaskForm';
import TaskColumnForm from './TaskColumnForm';
import { useTaskBoard } from '../../context/TaskBoardContext';
import type { TaskColumn as TaskColumnType } from '../../api/taskColumns';
import type { Task } from '../../api/tasks';
import TaskCard from './TaskCard';

export default function TaskColumn({ column, tasks, index }: { column: TaskColumnType; tasks: Task[]; index: number }) {
  const { projectId, deleteColumn } = useTaskBoard();
  const [openTaskForm, setOpenTaskForm] = useState(false);
  const [openColumnForm, setOpenColumnForm] = useState(false);
  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided: any) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="min-w-[280px] mr-4">
          <Card withBorder padding="sm" shadow="xs">
            <Group justify="space-between" {...provided.dragHandleProps}>
              <Text fw={600}>{column.name}</Text>
              <Group gap={4}>
                <Button size="xs" variant="light" onClick={() => setOpenTaskForm(true)}>+ Задача</Button>
                <Menu withinPortal position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" aria-label="Настройки колонки">
                      ⋮
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item onClick={() => setOpenColumnForm(true)}>Редактировать</Menu.Item>
                    <Menu.Item color="red" onClick={() => deleteColumn(column.id)}>Удалить</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>
            <Droppable droppableId={column.id} type="task">
              {(dropProvided: any) => (
                <Stack ref={dropProvided.innerRef} {...dropProvided.droppableProps} mt="sm">
                  {tasks.map((t, index) => (
                    <TaskCard key={t.id} task={t} index={index} />
                  ))}
                  {dropProvided.placeholder}
                </Stack>
              )}
            </Droppable>
            <TaskForm projectId={projectId} columnId={column.id} opened={openTaskForm} onClose={() => setOpenTaskForm(false)} />
            <TaskColumnForm projectId={projectId} opened={openColumnForm} onClose={() => setOpenColumnForm(false)} column={{ id: column.id, name: column.name }} />
          </Card>
        </div>
      )}
    </Draggable>
  );
}


