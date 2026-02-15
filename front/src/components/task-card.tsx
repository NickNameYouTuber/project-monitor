import React from 'react';
import { useDrag } from 'react-dnd';
import { Calendar, User, GitBranch, AlertCircle, MoreVertical } from 'lucide-react';
import {
  Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import { motion } from 'framer-motion';
import type { Task } from '../App';
import { getPriorityConfig } from '../lib/design-tokens';

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

  const priorityCfg = getPriorityConfig(task.priority);

  return (
    <motion.div
      id={`task-${task.id}`}
      ref={drag as any}
      layout
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'bg-card border border-border rounded-xl p-4 cursor-pointer transition-all duration-200',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        isDragging && 'opacity-50 scale-[0.98]',
        highlighted && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
      )}
      onClick={onClick}
    >
      <Flex className="items-start justify-between mb-2">
        <Badge className={cn('text-[11px] font-medium border', priorityCfg.className)}>
          <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', priorityCfg.dotColor)} />
          {task.priority}
        </Badge>
        {onEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); onEdit(e); }}
              >
                <MoreVertical className="w-3.5 h-3.5" />
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

      <Heading level={4} className="font-semibold mb-1.5 text-sm leading-snug">{task.title}</Heading>
      {task.description && (
        <Text className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {task.description}
        </Text>
      )}

      <VStack className="space-y-1.5">
        {task.assignee && (
          <Flex className="items-center text-[11px] text-muted-foreground gap-1.5">
            <Box className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-2.5 h-2.5 text-primary" />
            </Box>
            <Text as="span" className="truncate">{task.assignee}</Text>
          </Flex>
        )}

        {task.repositoryBranch && (
          <Flex className="items-center text-[11px] text-muted-foreground gap-1.5">
            <GitBranch className="w-3 h-3 flex-shrink-0" />
            <Box as="code" className="bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded text-[10px] font-mono truncate">
              {task.repositoryBranch}
            </Box>
          </Flex>
        )}

        <Flex className="items-center text-[11px] text-muted-foreground gap-1.5">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <Text as="span">{task.createdAt.toLocaleDateString()}</Text>
        </Flex>
      </VStack>
    </motion.div>
  );
}