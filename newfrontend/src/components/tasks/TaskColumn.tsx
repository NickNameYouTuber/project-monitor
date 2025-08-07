import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Card, Group, Stack, Text, Button } from '@mantine/core';
import { useState } from 'react';
import TaskForm from './TaskForm';
import { useTaskBoard } from '../../context/TaskBoardContext';
import type { TaskColumn as TaskColumnType } from '../../api/taskColumns';
import type { Task } from '../../api/tasks';
import TaskCard from './TaskCard';

export default function TaskColumn({ column, tasks }: { column: TaskColumnType; tasks: Task[] }) {
  const { projectId } = useTaskBoard();
  const [openTaskForm, setOpenTaskForm] = useState(false);
  return (
    <Draggable draggableId={column.id} index={column.order}>
      {(provided: any) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="min-w-[280px] mr-4">
          <Card withBorder padding="sm" shadow="xs">
            <Group justify="space-between" {...provided.dragHandleProps}>
              <Text fw={600}>{column.name}</Text>
              <Button size="xs" variant="light" onClick={() => setOpenTaskForm(true)}>+ Задача</Button>
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
          </Card>
        </div>
      )}
    </Draggable>
  );
}


