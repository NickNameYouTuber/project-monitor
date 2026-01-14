import React, { useState, useEffect } from 'react';
import {
  Button, Input, Label, Textarea, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter, Calendar, Popover, PopoverContent,
  PopoverTrigger, Separator,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { AutocompleteInput } from './autocomplete-input';
import type { Task } from '../App';

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (task: Task) => void;
  availableStatuses: { id: string; title: string }[];
  assigneeSuggestions: string[];
  branchSuggestions: string[];
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  availableStatuses,
  assigneeSuggestions,
  branchSuggestions
}: EditTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [repositoryBranch, setRepositoryBranch] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setAssignee(task.assignee || '');
      setDueDate(task.dueDate);
      setRepositoryBranch(task.repositoryBranch || '');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const { updateTask } = await import('../api/tasks');
      const updated = await updateTask(task.projectId, task.id, {
        title: title.trim(),
        description: description.trim(),
        column_id: status,
      });
      onUpdateTask({
        ...task,
        title: updated.title,
        description: updated.description || '',
        status: updated.columnId,
      });
    } catch { }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const { deleteTask } = await import('../api/tasks');
      await deleteTask(task.projectId, task.id);
      onOpenChange(false);
    } catch { }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and settings.
          </DialogDescription>
        </DialogHeader>

        <Box as="form" onSubmit={handleSubmit} className="space-y-4">
          <Box className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </Box>

          <Box className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </Box>

          <Box className="grid grid-cols-2 gap-4">
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
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value: Task['priority']) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Box>
          </Box>

          <Box className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <AutocompleteInput
              value={assignee}
              onChange={setAssignee}
              suggestions={assigneeSuggestions}
              placeholder="Enter assignee name"
            />
          </Box>

          <Box className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? formatDate(dueDate) : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </Box>

          <Box className="space-y-2">
            <Label htmlFor="branch">Repository Branch</Label>
            <AutocompleteInput
              value={repositoryBranch}
              onChange={setRepositoryBranch}
              suggestions={branchSuggestions}
              placeholder="e.g., feature/task-implementation"
            />
          </Box>

          <Separator />

          <Flex className="items-center justify-between text-sm text-muted-foreground">
            <Text as="span">Created: {task.createdAt.toLocaleDateString()}</Text>
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
              Delete Task
            </Button>
            <Flex className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Task</Button>
            </Flex>
          </DialogFooter>
        </Box>
      </DialogContent>
    </Dialog>
  );
}