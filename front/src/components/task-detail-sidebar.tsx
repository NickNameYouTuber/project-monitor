import React, { useEffect, useState } from 'react';
import { X, Calendar, User, GitBranch, AlertCircle, MessageSquare, Plus, Send, GitCommit } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import type { Task } from '../App';

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  type: 'user' | 'system';
}

interface TaskDetailSidebarProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailSidebar({ task, isOpen, onClose }: TaskDetailSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [branches, setBranches] = useState<{ name: string; createdAt: Date }[]>([]);
  const [newBranch, setNewBranch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const { listComments } = await import('../api/comments');
        const data = await listComments(task.id);
        const mapped: Comment[] = data.map((c) => ({
          id: c.id,
          author: c.username || c.userId || 'System',
          content: c.content,
          createdAt: new Date(c.createdAt),
          type: (c.system || c.is_system) ? 'system' : 'user',
        }));
        setComments(mapped);
        const { getTaskBranches } = await import('../api/task-repository');
        const bs = await getTaskBranches(task.id);
        setBranches(bs.map(b => ({ name: b.branch_name, createdAt: new Date(b.created_at) })));
      } catch {}
    })();
  }, [isOpen, task.id]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const { createComment } = await import('../api/comments');
      const created = await createComment({ task_id: task.id, content: newComment.trim() });
      const c: Comment = {
        id: created.id,
        author: created.username || created.userId || 'You',
        content: created.content,
        createdAt: new Date(created.createdAt),
        type: (created.system || created.is_system) ? 'system' : 'user',
      };
      setComments(prev => [...prev, c]);
      setNewComment('');
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h2 className="font-medium">Task Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content with proper scrolling */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Task Title */}
            <div>
              <h3 className="font-medium text-lg">{task.title}</h3>
              <p className="text-muted-foreground mt-1">{task.description}</p>
            </div>

            {/* Task Meta */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Priority:</span>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>

              {task.assignee && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Assignee:</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {task.assignee.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.assignee}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="text-sm">{task.createdAt.toLocaleDateString()}</span>
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Due:</span>
                  <span className="text-sm">{task.dueDate.toLocaleDateString()}</span>
                </div>
              )}

              {task.repositoryBranch && (
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Branch:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {task.repositoryBranch}
                  </code>
                </div>
              )}
              {branches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Linked branches:</span>
                  </div>
                  <div className="space-y-1">
                    {branches.map((b, idx) => (
                      <div key={idx} className="text-sm flex items-center gap-2">
                        <code className="bg-muted px-2 py-0.5 rounded">{b.name}</code>
                        <span className="text-xs text-muted-foreground">{b.createdAt.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4" />
                <h4 className="font-medium">Activity ({comments.length})</h4>
              </div>

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id}>
                    {comment.type === 'system' ? (
                      <div className="text-sm text-muted-foreground flex items-start gap-2">
                        <GitCommit className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span>{comment.content}</span>
                          <div className="text-xs mt-1">
                            {comment.createdAt.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {comment.author.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm bg-muted p-3 rounded-lg ml-8">
                          {comment.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addComment}>
                    <Send className="w-4 h-4 mr-2" />
                    Comment
                  </Button>
                </div>
              </div>

              {/* Attach Branch */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  <h4 className="font-medium">Attach Repository Branch</h4>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="branch/name" value={newBranch} onChange={(e) => setNewBranch(e.target.value)} />
                  <Button size="sm" onClick={async () => {
                    if (!newBranch.trim()) return;
                    try {
                      const { attachBranch } = await import('../api/task-repository');
                      await attachBranch(task.id, newBranch.trim());
                      setNewBranch('');
                      const { getTaskBranches } = await import('../api/task-repository');
                      const bs = await getTaskBranches(task.id);
                      setBranches(bs.map(b => ({ name: b.branch_name, createdAt: new Date(b.created_at) })));
                    } catch {}
                  }}>Attach</Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}