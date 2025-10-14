import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { AutocompleteInput } from './autocomplete-input';
import { listRepositories, getBranches, createBranch, type RepositoryDto } from '../api/repositories';
import { toast } from 'sonner';
import type { Task } from '../App';

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
  
  const [repositories, setRepositories] = useState<RepositoryDto[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isCreatingNewBranch, setIsCreatingNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      listRepositories({ project_id: projectId })
        .then(repos => {
          setRepositories(repos);
          if (repos.length > 0 && !selectedRepoId) {
            setSelectedRepoId(repos[0].id);
          }
        })
        .catch(() => toast.error('Failed to load repositories'));
    }
  }, [open, projectId]);

  useEffect(() => {
    if (selectedRepoId) {
      setLoadingBranches(true);
      getBranches(selectedRepoId)
        .then(branchList => {
          setBranches(branchList);
          if (branchList.length > 0 && !selectedBranch) {
            setSelectedBranch(branchList[0]);
          }
        })
        .catch(() => toast.error('Failed to load branches'))
        .finally(() => setLoadingBranches(false));
    }
  }, [selectedRepoId]);

  const handleCreateNewBranch = async () => {
    if (!selectedRepoId || !newBranchName.trim()) return;
    try {
      await createBranch(selectedRepoId, newBranchName, selectedBranch || undefined);
      toast.success('Branch created');
      const updatedBranches = await getBranches(selectedRepoId);
      setBranches(updatedBranches);
      setSelectedBranch(newBranchName);
      setIsCreatingNewBranch(false);
      setNewBranchName('');
    } catch {
      toast.error('Failed to create branch');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: assignee.trim() || undefined,
      dueDate,
      repositoryBranch: selectedBranch || undefined,
    });

    setTitle('');
    setDescription('');
    setStatus(availableStatuses[0]?.id || '');
    setPriority('medium');
    setAssignee('');
    setDueDate(undefined);
    setSelectedRepoId('');
    setSelectedBranch('');
    setIsCreatingNewBranch(false);
    setNewBranchName('');
    onOpenChange(false);
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
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to the current project.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
            </div>
            
            <div className="space-y-2">
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
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <AutocompleteInput
              value={assignee}
              onChange={setAssignee}
              suggestions={assigneeSuggestions}
              placeholder="Enter assignee name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  type="button"
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
          </div>

          {repositories.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Repository</Label>
                <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map(repo => (
                      <SelectItem key={repo.id} value={repo.id}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRepoId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Branch</Label>
                    {!isCreatingNewBranch && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreatingNewBranch(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New Branch
                      </Button>
                    )}
                  </div>
                  
                  {isCreatingNewBranch ? (
                    <div className="flex gap-2">
                      <Input
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        placeholder="feature/task-name"
                      />
                      <Button
                        type="button"
                        onClick={handleCreateNewBranch}
                        disabled={!newBranchName.trim()}
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingNewBranch(false);
                          setNewBranchName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Select 
                      value={selectedBranch} 
                      onValueChange={setSelectedBranch}
                      disabled={loadingBranches || branches.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingBranches ? "Loading..." : "Select branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch} value={branch}>
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
