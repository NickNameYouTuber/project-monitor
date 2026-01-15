import React, { useEffect, useState } from 'react';
import { X, Calendar, User, GitBranch, AlertCircle, MessageSquare, Plus, Send, GitCommit, Video, Folder, ExternalLink } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Button, Badge, Input, Textarea, Avatar, AvatarFallback, ScrollArea, Separator,
  Box, Flex, VStack, Heading, Text
} from '@nicorp/nui';
import { useNavigate } from 'react-router-dom';
import { ActiveCallIndicator } from './active-call-indicator';
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
  projectId?: string;
}

export function TaskDetailSidebar({ task, isOpen, onClose, projectId }: TaskDetailSidebarProps) {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [branches, setBranches] = useState<{ name: string; createdAt: Date }[]>([]);
  const [newBranch, setNewBranch] = useState('');
  const [sections, setSections] = useState<any[]>([]);
  const [linkedSections, setLinkedSections] = useState<any[]>([]);

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

        if (projectId) {
          const { getProjectSections } = await import('../api/whiteboards');
          const allSections = await getProjectSections(projectId);
          setSections(allSections);
          // Check for task_id (snake_case from backend) or taskId (if transformed)
          const linked = allSections.filter((s: any) => (s.task_id === task.id || s.taskId === task.id));
          setLinkedSections(linked);
        }
      } catch { }
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
    } catch { }
  };

  if (!isOpen) return null;

  return (
    <Flex className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border z-50 flex-col">
      {/* Header */}
      <Flex className="items-center justify-between p-4 border-b border-border flex-shrink-0">
        <Heading level={2} className="font-medium text-base">Task Details</Heading>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </Flex>

      {/* Content with proper scrolling */}
      <Box className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <VStack className="p-4 space-y-6">
            {/* Task Title */}
            <Box>
              <Heading level={3} className="font-medium text-lg">{task.title}</Heading>
              <Text className="text-muted-foreground mt-1">{task.description}</Text>
              <Button
                variant="default"
                size="sm"
                className="mt-3 w-full"
                onClick={async () => {
                  const roomId = `task-${task.id}-${Date.now()}`;
                  try {
                    // Создаем звонок в БД
                    const { createCall } = await import('../api/calls');
                    await createCall({
                      room_id: roomId,
                      title: `Звонок: ${task.title}`,
                      description: `Звонок по задаче ${task.title}`,
                      task_id: task.id,
                      project_id: task.projectId,
                    });
                  } catch (error) {
                    console.error('Ошибка создания звонка:', error);
                  }
                  // Переходим на страницу звонка
                  navigate(`/call/${roomId}`);
                  onClose();
                }}
              >
                <Video className="w-4 h-4 mr-2" />
                Start Call
              </Button>

              {/* Индикатор активных звонков для задачи */}
              <Box className="mt-3">
                <ActiveCallIndicator taskId={task.id} />
              </Box>
            </Box>

            {/* Task Meta */}
            <VStack className="space-y-3">
              <Flex className="items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <Text as="span" className="text-sm text-muted-foreground">Priority:</Text>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </Flex>

              {task.assignee && (
                <Flex className="items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Text as="span" className="text-sm text-muted-foreground">Assignee:</Text>
                  <Flex className="items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {task.assignee.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <Text as="span" className="text-sm">{task.assignee}</Text>
                  </Flex>
                </Flex>
              )}

              <Flex className="items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Text as="span" className="text-sm text-muted-foreground">Created:</Text>
                <Text as="span" className="text-sm">{task.createdAt.toLocaleDateString()}</Text>
              </Flex>

              {task.dueDate && (
                <Flex className="items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Text as="span" className="text-sm text-muted-foreground">Due:</Text>
                  <Text as="span" className="text-sm">{task.dueDate.toLocaleDateString()}</Text>
                </Flex>
              )}

              {task.repositoryInfo && (
                <VStack className="space-y-2">
                  <Flex className="items-center gap-2">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    <Text as="span" className="text-sm text-muted-foreground">Repository:</Text>
                    <Text as="span" className="text-sm font-medium">{task.repositoryInfo.repositoryName}</Text>
                  </Flex>
                  <Flex className="items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <Text as="span" className="text-sm text-muted-foreground">Branch:</Text>
                    <Box as="code" className="text-sm bg-muted px-2 py-1 rounded">
                      {task.repositoryInfo.branch}
                    </Box>
                  </Flex>
                </VStack>
              )}
              {branches.length > 0 && (
                <VStack className="space-y-2">
                  <Flex className="items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <Text as="span" className="text-sm text-muted-foreground">Linked branches:</Text>
                  </Flex>
                  <VStack className="space-y-1">
                    {branches.map((b, idx) => (
                      <Flex key={idx} className="text-sm items-center gap-2">
                        <Box as="code" className="bg-muted px-2 py-0.5 rounded">{b.name}</Box>
                        <Text as="span" className="text-xs text-muted-foreground">{b.createdAt.toLocaleString()}</Text>
                      </Flex>
                    ))}
                  </VStack>
                </VStack>
              )}
            </VStack>

            <Separator />

            {/* Comments Section */}
            <Box>
              <Flex className="items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4" />
                <Heading level={4} className="font-medium text-base">Activity ({comments.length})</Heading>
              </Flex>

              <VStack className="space-y-4">
                {comments.map((comment) => (
                  <Box key={comment.id}>
                    {comment.type === 'system' ? (
                      <Flex className="text-sm text-muted-foreground items-start gap-2">
                        <GitCommit className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <Box className="flex-1">
                          <Text as="span">{comment.content}</Text>
                          <Text className="text-xs mt-1">
                            {comment.createdAt.toLocaleString()}
                          </Text>
                        </Box>
                      </Flex>
                    ) : (
                      <VStack className="space-y-2">
                        <Flex className="items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {comment.author.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <Text as="span" className="text-sm font-medium">{comment.author}</Text>
                          <Text as="span" className="text-xs text-muted-foreground">
                            {comment.createdAt.toLocaleString()}
                          </Text>
                        </Flex>
                        <Text className="text-sm bg-muted p-3 rounded-lg ml-8">
                          {comment.content}
                        </Text>
                      </VStack>
                    )}
                  </Box>
                ))}
              </VStack>

              {/* Add Comment */}
              <VStack className="mt-4 space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <Flex className="justify-end">
                  <Button size="sm" onClick={addComment}>
                    <Send className="w-4 h-4 mr-2" />
                    Comment
                  </Button>
                </Flex>
              </VStack>

              {/* Attach Branch */}
              <VStack className="mt-6 space-y-2">
                <Flex className="items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  <Heading level={4} className="font-medium text-base">Attach Repository Branch</Heading>
                </Flex>
                <Flex className="gap-2">
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
                    } catch { }
                  }}>Attach</Button>
                </Flex>
              </VStack>

              {/* Whiteboard Sections */}
              {projectId && (
                <VStack className="mt-6 space-y-2">
                  <Flex className="items-center gap-2">
                    <Folder className="w-4 h-4" />
                    <Heading level={4} className="font-medium text-base">Whiteboard Sections</Heading>
                  </Flex>
                  {linkedSections.length > 0 && (
                    <VStack className="space-y-2">
                      <Text className="text-sm text-muted-foreground">Linked sections:</Text>
                      {linkedSections.map((section: any) => (
                        <Flex key={section.id} className="items-center justify-between p-2 bg-muted rounded">
                          <Text as="span" className="text-sm">{section.text || 'Untitled Section'}</Text>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                const { getOrCreateWhiteboard } = await import('../api/whiteboards');
                                const board = await getOrCreateWhiteboard(projectId);
                                const sectionElement = board.elements.find((e: any) => e.id === section.id);
                                if (sectionElement) {
                                  const orgId = window.location.pathname.split('/')[1];
                                  navigate(`/${orgId}/projects/${projectId}/whiteboard?elementId=${section.id}`);
                                  onClose();
                                }
                              } catch (error) {
                                console.error('Failed to navigate to section:', error);
                              }
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Go to
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              try {
                                const { unlinkElementFromTask } = await import('../api/whiteboards');
                                await unlinkElementFromTask(section.id);
                                // Refresh sections
                                const { getProjectSections } = await import('../api/whiteboards');
                                const allSections = await getProjectSections(projectId);
                                setSections(allSections);
                                const linked = allSections.filter((s: any) => s.task_id === task.id);
                                setLinkedSections(linked);
                              } catch (error) {
                                console.error('Failed to unlink section:', error);
                              }
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </Flex>
                      ))}
                    </VStack>
                  )}
                  <Flex className="gap-2">
                    <Select onValueChange={async (sectionId) => {
                      try {
                        const { linkElementToTask } = await import('../api/whiteboards');
                        await linkElementToTask(sectionId, task.id);
                        const { getProjectSections } = await import('../api/whiteboards');
                        const allSections = await getProjectSections(projectId);
                        setSections(allSections);
                        const linked = allSections.filter((s: any) => s.task_id === task.id);
                        setLinkedSections(linked);
                      } catch (error) {
                        console.error('Failed to link section:', error);
                      }
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.filter((s: any) => s.task_id !== task.id).length === 0 ? (
                          <SelectItem value="none" disabled>No sections available</SelectItem>
                        ) : (
                          sections.filter((s: any) => s.task_id !== task.id).map((section: any) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.text || 'Untitled Section'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Flex>
                </VStack>
              )}
            </Box>
          </VStack>
        </ScrollArea>
      </Box>
    </Flex>
  );
}