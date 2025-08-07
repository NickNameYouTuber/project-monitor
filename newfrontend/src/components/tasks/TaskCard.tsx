import { Draggable } from '@hello-pangea/dnd';
import { Card, Group, Menu, Text, ActionIcon } from '@mantine/core';
import type { Task } from '../../api/tasks';
import { useState } from 'react';
import TaskForm from './TaskForm';

export default function TaskCard({ task, index }: { task: Task; index: number }) {
  const [openEdit, setOpenEdit] = useState(false);
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided: any) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <Card withBorder padding="sm" shadow="xs">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={500}>{task.title}</Text>
                {task.description && (
                  <Text size="sm" c="dimmed" mt={4}>
                    {task.description}
                  </Text>
                )}
              </div>
              <Menu withinPortal position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" aria-label="Настройки задачи">⋮</ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => setOpenEdit(true)}>Редактировать</Menu.Item>
                  <Menu.Item color="red">Удалить</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
            <TaskForm projectId={task.project_id} opened={openEdit} onClose={() => setOpenEdit(false)} task={task} />
          </Card>
        </div>
      )}
    </Draggable>
  );
}


