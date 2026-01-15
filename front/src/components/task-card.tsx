import React from 'react';
import { useDrag } from 'react-dnd';
import { Calendar, User, GitBranch, AlertCircle, MoreVertical } from 'lucide-react';
import {
  Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import type { Task } from '../App';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  highlighted?: boolean;
}

export function TaskCard({ task, onClick, onEdit, highlighted }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { id: task.id, type: 'task' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      id={`task-${task.id}`}
      ref={drag as any}
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all",
        isDragging && "opacity-50",
        highlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
      )}
      onClick={onClick}
    >
      <Flex className="items-start justify-between mb-2">
        <Badge className={getPriorityColor(task.priority)}>
          {task.priority}
        </Badge>
        {onEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onEdit}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </Flex>

      <Heading level={4} className="font-medium mb-2 text-base">{task.title}</Heading>
      <Text className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {task.description}
      </Text>

      <VStack className="space-y-2">
        {task.assignee && (
          <Flex className="items-center text-xs text-muted-foreground">
            <User className="w-3 h-3 mr-1" />
            <Text as="span">{task.assignee}</Text>
          </Flex>
        )}

        {task.repositoryBranch && (
          <Flex className="items-center text-xs text-muted-foreground">
            <GitBranch className="w-3 h-3 mr-1" />
            <Box as="code" className="bg-muted px-1 rounded text-xs">
              {task.repositoryBranch}
            </Box>
          </Flex>
        )}

        <Flex className="items-center text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 mr-1" />
          <Text as="span">{task.createdAt.toLocaleDateString()}</Text>
        </Flex>
      </VStack>
    </div>
  );
}