import React from 'react';
import { useDrag } from 'react-dnd';
import { Calendar, User, MoreVertical } from 'lucide-react';
import {
  Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  Box, Flex, Heading, Text, cn
} from '@nicorp/nui';
import { motion } from 'framer-motion';
import type { Project } from '../App';
import { getStatusConfig } from '../lib/design-tokens';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
}

export function ProjectCard({ project, onClick, onEdit }: ProjectCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'project',
    item: { id: project.id, type: 'project' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const statusCfg = getStatusConfig(project.status);

  return (
    <motion.div
      ref={drag as any}
      layout
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'bg-card border border-border rounded-xl p-4 cursor-pointer transition-all duration-200',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        isDragging && 'opacity-50 scale-[0.98]'
      )}
      onClick={onClick}
    >
      <Flex className="items-start justify-between mb-3">
        <Flex className="items-center gap-2">
          <Box
            className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-card"
            style={{ backgroundColor: project.color, boxShadow: `0 0 8px ${project.color}40` }}
          />
        </Flex>
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
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Flex>

      <Heading level={3} className="font-semibold mb-1.5 text-sm leading-snug">{project.title}</Heading>
      {project.description && (
        <Text className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {project.description}
        </Text>
      )}

      <Flex className="items-center justify-between">
        <Badge variant="secondary" className={cn('text-[11px] font-medium border', statusCfg.className)}>
          {project.status.replace('-', ' ')}
        </Badge>
        <Flex className="items-center text-[11px] text-muted-foreground gap-1">
          <Calendar className="w-3 h-3" />
          {project.createdAt.toLocaleDateString()}
        </Flex>
      </Flex>
    </motion.div>
  );
}