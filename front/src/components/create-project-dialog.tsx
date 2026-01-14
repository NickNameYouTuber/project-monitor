import React, { useState } from 'react';
import {
  Button, Input, Label, Textarea, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import type { Project } from '../App';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  availableStatuses: { id: string; title: string }[];
}

const colors = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

export function CreateProjectDialog({ open, onOpenChange, onCreateProject, availableStatuses }: CreateProjectDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(availableStatuses[0]?.id || '');
  const [color, setColor] = useState(colors[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateProject({
      title: title.trim(),
      description: description.trim(),
      status,
      color,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setStatus(availableStatuses[0]?.id || '');
    setColor(colors[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to your workspace.
          </DialogDescription>
        </DialogHeader>

        <Box as="form" onSubmit={handleSubmit} className="space-y-4">
          <Box className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter project title"
              required
            />
          </Box>

          <Box className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </Box>

          <Box className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map(statusOption => (
                  <SelectItem key={statusOption.id} value={statusOption.id}>
                    {statusOption.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Box>

          <Box className="space-y-2">
            <Label>Color</Label>
            <Flex className="gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${color === colorOption ? 'border-foreground' : 'border-transparent'
                    }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </Flex>
          </Box>

          <Flex className="justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </Flex>
        </Box>
      </DialogContent>
    </Dialog>
  );
}