import React, { useState, useEffect } from 'react';
import {
  Button, Input, Label, Textarea, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter, Separator,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { Project } from '../App';

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateProject: (project: Project) => void;
  onNavigateToTasks: () => void;
  availableStatuses: { id: string; title: string }[];
}

const colors = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onUpdateProject,
  onNavigateToTasks,
  availableStatuses
}: EditProjectDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description);
      setStatus(project.status);
      setColor(project.color);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onUpdateProject({
      ...project,
      title: title.trim(),
      description: description.trim(),
      status,
      color,
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this project?')) {
      // Handle project deletion logic here
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details and settings.
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

          <Separator />

          <Flex className="items-center justify-between text-sm text-muted-foreground">
            <Text as="span">Created: {project.createdAt.toLocaleDateString()}</Text>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNavigateToTasks}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Tasks
            </Button>
          </Flex>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="sm:mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Project
            </Button>
            <Flex className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Project</Button>
            </Flex>
          </DialogFooter>
        </Box>
      </DialogContent>
    </Dialog>
  );
}