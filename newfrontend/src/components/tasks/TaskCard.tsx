import { Draggable } from '@hello-pangea/dnd';
import { Card, Text } from '@mantine/core';
import type { Task } from '../../api/tasks';

export default function TaskCard({ task, index }: { task: Task; index: number }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided: any) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <Card withBorder padding="sm" shadow="xs">
            <Text fw={500}>{task.title}</Text>
            {task.description && (
              <Text size="sm" c="dimmed" mt={4}>
                {task.description}
              </Text>
            )}
          </Card>
        </div>
      )}
    </Draggable>
  );
}


