import React, { useState, useEffect } from 'react';
import {
  Button, Input, Label, Textarea, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DatePicker, Combobox,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import type { Task } from '../App';
import { listRepositories } from '../api/repositories';
import { apiClient } from '../api/client';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'projectId'>) => void;
  availableStatuses: { id: string; title: string }[];
  assigneeSuggestions: string[];
  branchSuggestions: string[];
  projectId?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onCreateTask,
  availableStatuses,
  assigneeSuggestions,
  branchSuggestions,
  projectId
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(availableStatuses[0]?.id || '');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedRepository, setSelectedRepository] = useState<string | undefined>(undefined);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [baseBranch, setBaseBranch] = useState<string>('');
  const [createNewBranch, setCreateNewBranch] = useState<boolean>(false);
  const [repositories, setRepositories] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      listRepositories({ project_id: projectId }).then(repos => {
        setRepositories(repos.map(r => ({ id: r.id, name: r.name })));
      }).catch(console.error);
    }
  }, [open, projectId]);

  useEffect(() => {
    if (selectedRepository) {
      setLoadingBranches(true);
      apiClient.get(`/repositories/${selectedRepository}/refs/branches`)
        .then(({ data }) => {
          setBranches(data);
          if (data.length > 0) {
            setBaseBranch(data[0]);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingBranches(false));
    } else {
      setBranches([]);
    }
  }, [selectedRepository]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let branchToUse = selectedBranch;

    if (createNewBranch && newBranchName.trim() && selectedRepository) {
      try {
        await apiClient.post(`/repositories/${selectedRepository}/refs/branches`, {
          name: newBranchName.trim(),
          base_branch: baseBranch
        });
        branchToUse = newBranchName.trim();
      } catch (error) {
        console.error('Failed to create branch:', error);
        return;
      }
    }

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: assignee.trim() || undefined,
      dueDate,
      repository_id: selectedRepository || undefined,
      repositoryBranch: branchToUse || undefined,
    });

    setTitle('');
    setDescription('');
    setStatus(availableStatuses[0]?.id || '');
    setPriority('medium');
    setAssignee('');
    setDueDate(undefined);
    setSelectedRepository(undefined);
    setSelectedBranch('');
    setNewBranchName('');
    setCreateNewBranch(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to the current project.
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
            <Combobox
              options={assigneeSuggestions.map(s => ({ value: s, label: s }))}
              value={assignee}
              onChange={setAssignee}
              placeholder="Select assignee"
              searchPlaceholder="Search assignees..."
              emptyText="No assignees found"
            />
          </Box>

          <Box className="space-y-2">
            <Label>Due Date</Label>
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Pick a date"
            />
          </Box>

          <Box className="space-y-2">
            <Label>Repository</Label>
            <Select value={selectedRepository} onValueChange={setSelectedRepository}>
              <SelectTrigger>
                <SelectValue placeholder="Select repository (optional)" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map(repo => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Box>

          {selectedRepository && (
            <>
              <Box className="space-y-2">
                <Label>Branch</Label>
                {loadingBranches ? (
                  <Text className="text-sm text-muted-foreground">Loading branches...</Text>
                ) : (
                  <Select
                    value={createNewBranch ? 'new' : selectedBranch}
                    onValueChange={(val) => {
                      if (val === 'new') {
                        setCreateNewBranch(true);
                        setSelectedBranch('');
                      } else {
                        setCreateNewBranch(false);
                        setSelectedBranch(val);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                      <SelectItem value="new">+ Create new branch</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Box>

              {createNewBranch && (
                <>
                  <Box className="space-y-2">
                    <Label htmlFor="newBranchName">New Branch Name</Label>
                    <Input
                      id="newBranchName"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="e.g., feature/task-implementation"
                    />
                  </Box>

                  <Box className="space-y-2">
                    <Label>Base Branch</Label>
                    <Select value={baseBranch} onValueChange={setBaseBranch}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch} value={branch}>
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Box>
                </>
              )}
            </>
          )}

          <Flex className="justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </Flex>
        </Box>
      </DialogContent>
    </Dialog>
  );
}