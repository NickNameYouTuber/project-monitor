import React, { useState } from 'react';
import { ArrowLeft, GitBranch, Eye, MessageSquare, Check, X, Plus, Send, GitMerge, User, Calendar } from 'lucide-react';
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Tabs, TabsContent, TabsList, TabsTrigger, Avatar, AvatarFallback,
  Textarea, ScrollArea, Separator, Box, Flex, VStack, Grid, Heading, Text
} from '@nicorp/nui';

interface MergeRequestPageProps {
  branch: string;
  onBack: () => void;
}

interface MRComment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  type: 'comment' | 'system' | 'code';
  changes?: {
    file: string;
    lines: number[];
    code: string[];
  };
  parentId?: string; // For replies
}

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  changes: {
    type: 'addition' | 'deletion' | 'context';
    lineNumber: number;
    content: string;
  }[];
}

const mockFileChanges: FileChange[] = [];

export function MergeRequestPage({ branch, onBack }: MergeRequestPageProps) {
  const [comments, setComments] = useState<MRComment[]>([]);

  const [newComment, setNewComment] = useState('');
  const [selectedLines, setSelectedLines] = useState<{
    file: string;
    lines: { lineNumber: number; content: string; type: 'addition' | 'deletion' | 'context' }[];
  } | null>(null);
  const [codeCommentText, setCodeCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const addComment = () => {
    if (newComment.trim()) {
      const comment: MRComment = {
        id: Date.now().toString(),
        author: 'You',
        content: newComment.trim(),
        timestamp: new Date(),
        type: 'comment'
      };
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
  };

  const addCodeComment = () => {
    if (codeCommentText.trim() && selectedLines) {
      const comment: MRComment = {
        id: Date.now().toString(),
        author: 'You',
        content: codeCommentText.trim(),
        timestamp: new Date(),
        type: 'code',
        changes: {
          file: selectedLines.file,
          lines: selectedLines.lines.map(l => l.lineNumber),
          code: selectedLines.lines.map(l => l.content)
        }
      };
      setComments(prev => [...prev, comment]);
      setCodeCommentText('');
      setSelectedLines(null);
    }
  };

  const addReply = (parentId: string) => {
    if (replyText.trim()) {
      const reply: MRComment = {
        id: Date.now().toString(),
        author: 'You',
        content: replyText.trim(),
        timestamp: new Date(),
        type: 'comment',
        parentId
      };
      setComments(prev => [...prev, reply]);
      setReplyText('');
      setReplyingTo(null);
    }
  };

  const handleLineSelection = (file: string, lineNumber: number, content: string, type: 'addition' | 'deletion' | 'context', event: React.MouseEvent) => {
    if (event.shiftKey && selectedLines && selectedLines.file === file) {
      // Extend selection
      const currentLines = selectedLines.lines;
      const minLine = Math.min(...currentLines.map(l => l.lineNumber));
      const maxLine = Math.max(...currentLines.map(l => l.lineNumber));

      if (lineNumber < minLine || lineNumber > maxLine) {
        // Find all lines in range
        const fileChanges = mockFileChanges.find(f => f.path === file);
        if (fileChanges) {
          const startLine = Math.min(lineNumber, minLine);
          const endLine = Math.max(lineNumber, maxLine);
          const newLines = fileChanges.changes
            .filter(change => change.lineNumber >= startLine && change.lineNumber <= endLine)
            .map(change => ({
              lineNumber: change.lineNumber,
              content: change.content,
              type: change.type
            }));
          setSelectedLines({ file, lines: newLines });
        }
      }
    } else {
      // Start new selection
      setSelectedLines({
        file,
        lines: [{ lineNumber, content, type }]
      });
    }
  };

  const getCommentReplies = (commentId: string) => {
    return comments.filter(comment => comment.parentId === commentId);
  };

  const getTopLevelComments = () => {
    return comments.filter(comment => !comment.parentId);
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown renderer for demonstration
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded">$1</code>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-medium mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-medium mt-8 mb-4">$1</h1>')
      .replace(/\n/g, '<br>');
  };

  const description = `# Implement Drag and Drop Functionality

## Overview
This merge request implements drag and drop functionality for the kanban boards using **react-dnd** library.

## Changes Made
- Added drag and drop support for task cards
- Implemented column-to-column task movement
- Added visual feedback during drag operations
- Updated task card styling for better UX

## Technical Details
- Used \`react-dnd\` with HTML5 backend
- Implemented \`useDrag\` hook for task cards
- Implemented \`useDrop\` hook for columns
- Added proper TypeScript interfaces

## Testing
- [x] Manual testing on all browsers
- [x] Drag and drop works correctly
- [ ] Unit tests (pending)

## Screenshots
*(Screenshots would be here in a real implementation)*`;

  const totalAdditions = mockFileChanges.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = mockFileChanges.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <Flex className="h-full flex-col">
      {/* Header */}
      <Box className="border-b border-border p-6">
        <Flex className="items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Flex className="items-center gap-2">
            <GitMerge className="w-5 h-5 text-muted-foreground" />
            <Text variant="muted" size="sm">Merge Request #42</Text>
          </Flex>
        </Flex>

        <Flex className="items-start justify-between">
          <Box className="flex-1">
            <Heading level={2} className="text-2xl font-medium mb-2">
              Implement drag and drop functionality for kanban boards
            </Heading>
            <Flex className="items-center gap-4 text-sm text-muted-foreground">
              <Flex className="items-center gap-1">
                <GitBranch className="w-4 h-4" />
                <Box as="code" className="bg-muted px-2 py-1 rounded text-xs">{branch}</Box>
                <Text as="span">→</Text>
                <Box as="code" className="bg-muted px-2 py-1 rounded text-xs">main</Box>
              </Flex>
              <Flex className="items-center gap-1">
                <User className="w-4 h-4" />
                <Text as="span">Created by John Doe</Text>
              </Flex>
              <Flex className="items-center gap-1">
                <Calendar className="w-4 h-4" />
                <Text as="span">2 hours ago</Text>
              </Flex>
            </Flex>
          </Box>
          <Flex className="items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Open
            </Badge>
            <Button variant="outline" size="sm">
              <Check className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button size="sm">
              <GitMerge className="w-4 h-4 mr-2" />
              Merge
            </Button>
          </Flex>
        </Flex>

        <Flex className="items-center gap-4 mt-4 text-sm">
          <Text as="span" className="text-green-600">+{totalAdditions} additions</Text>
          <Text as="span" className="text-red-600">-{totalDeletions} deletions</Text>
          <Text as="span" className="text-muted-foreground">{mockFileChanges.length} files changed</Text>
        </Flex>
      </Box>

      {/* Content */}
      <Box className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commits">Commits (3)</TabsTrigger>
            <TabsTrigger value="changes">Changes ({mockFileChanges.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 p-6 overflow-auto">
            <VStack className="max-w-4xl space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(description) }}
                  />
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Discussion ({comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Comments */}
                  {getTopLevelComments().map((comment) => (
                    <VStack key={comment.id} className="space-y-3">
                      {comment.type === 'system' ? (
                        <Flex className="text-sm text-muted-foreground items-start gap-2">
                          <Box className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></Box>
                          <Box className="flex-1">
                            <Text as="span">{comment.content}</Text>
                            <Text size="xs" className="mt-1">
                              {comment.timestamp.toLocaleString()}
                            </Text>
                          </Box>
                        </Flex>
                      ) : comment.type === 'code' ? (
                        <VStack className="space-y-2">
                          <Flex className="items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {comment.author.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <Text size="sm" weight="medium" as="span">{comment.author}</Text>
                            <Text size="xs" variant="muted" as="span">
                              {comment.timestamp.toLocaleString()}
                            </Text>
                          </Flex>

                          {/* Code snippet styled like Changes tab */}
                          {comment.changes && (
                            <Box className="ml-8 mb-2 bg-muted/30 rounded-lg overflow-hidden">
                              <Box className="text-xs text-muted-foreground px-3 py-2 bg-muted/50 border-b">
                                {comment.changes.file}
                              </Box>
                              {comment.changes.code.map((codeLine, index) => {
                                // Determine line type from original file changes
                                const lineNumber = comment.changes!.lines[index];
                                const fileChange = mockFileChanges.find(f => f.path === comment.changes!.file);
                                const originalLine = fileChange?.changes.find(c => c.lineNumber === lineNumber);
                                const lineType = originalLine?.type || 'context';

                                return (
                                  <Flex key={index} className={`items-center text-sm font-mono ${lineType === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                                    lineType === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                                      ''
                                    }`}>
                                    <Box className="w-12 text-center text-muted-foreground border-r border-border py-1">
                                      {lineNumber}
                                    </Box>
                                    <Box className={`w-6 text-center ${lineType === 'addition' ? 'text-green-600' :
                                      lineType === 'deletion' ? 'text-red-600' :
                                        ''
                                      }`}>
                                      {lineType === 'addition' ? '+' :
                                        lineType === 'deletion' ? '-' : ''}
                                    </Box>
                                    <Box className="flex-1 px-4 py-1">
                                      {codeLine}
                                    </Box>
                                  </Flex>
                                );
                              })}
                            </Box>
                          )}

                          <Text size="sm" className="bg-muted p-3 rounded-lg ml-8">
                            {comment.content}
                          </Text>

                          {/* Reply input for code comments */}
                          <Box className="ml-8">
                            {replyingTo === comment.id ? (
                              <VStack className="space-y-2">
                                <Textarea
                                  placeholder="Reply to this comment..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[60px]"
                                />
                                <Flex className="justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReplyingTo(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={() => addReply(comment.id)}>
                                    Reply
                                  </Button>
                                </Flex>
                              </VStack>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(comment.id)}
                              >
                                Reply
                              </Button>
                            )}

                            {/* Show replies */}
                            <VStack className="mt-2 space-y-2">
                              {getCommentReplies(comment.id).map(reply => (
                                <VStack key={reply.id} className="space-y-2">
                                  <Flex className="items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarFallback className="text-xs">
                                        {reply.author.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <Text size="sm" weight="medium" as="span">{reply.author}</Text>
                                    <Text size="xs" variant="muted" as="span">
                                      {reply.timestamp.toLocaleString()}
                                    </Text>
                                  </Flex>
                                  <Text size="sm" className="bg-muted p-2 rounded ml-7">
                                    {reply.content}
                                  </Text>
                                </VStack>
                              ))}
                            </VStack>
                          </Box>
                        </VStack>
                      ) : (
                        <VStack className="space-y-2">
                          <Flex className="items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {comment.author.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <Text size="sm" weight="medium" as="span">{comment.author}</Text>
                            <Text size="xs" variant="muted" as="span">
                              {comment.timestamp.toLocaleString()}
                            </Text>
                          </Flex>
                          <Text size="sm" className="bg-muted p-3 rounded-lg ml-8">
                            {comment.content}
                          </Text>

                          {/* Reply input for regular comments */}
                          <Box className="ml-8">
                            {replyingTo === comment.id ? (
                              <VStack className="space-y-2">
                                <Textarea
                                  placeholder="Reply to this comment..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[60px]"
                                />
                                <Flex className="justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReplyingTo(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={() => addReply(comment.id)}>
                                    Reply
                                  </Button>
                                </Flex>
                              </VStack>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(comment.id)}
                              >
                                Reply
                              </Button>
                            )}

                            {/* Show replies */}
                            <VStack className="mt-2 space-y-2">
                              {getCommentReplies(comment.id).map(reply => (
                                <VStack key={reply.id} className="space-y-2">
                                  <Flex className="items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarFallback className="text-xs">
                                        {reply.author.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <Text size="sm" weight="medium" as="span">{reply.author}</Text>
                                    <Text size="xs" variant="muted" as="span">
                                      {reply.timestamp.toLocaleString()}
                                    </Text>
                                  </Flex>
                                  <Text size="sm" className="bg-muted p-2 rounded ml-7">
                                    {reply.content}
                                  </Text>
                                </VStack>
                              ))}
                            </VStack>
                          </Box>
                        </VStack>
                      )}
                    </VStack>
                  ))}

                  <Separator />

                  {/* Add Comment */}
                  <VStack className="space-y-3">
                    <Flex className="items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">You</AvatarFallback>
                      </Avatar>
                      <Text size="sm" weight="medium" as="span">Add a comment</Text>
                    </Flex>
                    <Textarea
                      placeholder="Write a comment..."
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

                  {/* Code comment dialog */}
                  {selectedLines && (
                    <Card className="border-primary/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Comment on selected code</CardTitle>
                        <Text size="xs" variant="muted">
                          {selectedLines.lines.length} line{selectedLines.lines.length > 1 ? 's' : ''} selected
                        </Text>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Box className="bg-muted/30 rounded-lg overflow-hidden">
                          <Box className="text-xs text-muted-foreground px-3 py-2 bg-muted/50 border-b">
                            {selectedLines.file}
                          </Box>
                          {selectedLines.lines.map((line, index) => (
                            <Flex key={index} className={`items-center text-sm font-mono ${line.type === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                              line.type === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                                ''
                              }`}>
                              <Box className="w-12 text-center text-muted-foreground border-r border-border py-1">
                                {line.lineNumber}
                              </Box>
                              <Box className={`w-6 text-center ${line.type === 'addition' ? 'text-green-600' :
                                line.type === 'deletion' ? 'text-red-600' :
                                  ''
                                }`}>
                                {line.type === 'addition' ? '+' :
                                  line.type === 'deletion' ? '-' : ''}
                              </Box>
                              <Box className="flex-1 px-4 py-1">
                                {line.content}
                              </Box>
                            </Flex>
                          ))}
                        </Box>
                        <Textarea
                          placeholder="Add your comment about this code..."
                          value={codeCommentText}
                          onChange={(e) => setCodeCommentText(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Flex className="justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLines(null)}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={addCodeComment}>
                            <Send className="w-4 h-4 mr-2" />
                            Comment
                          </Button>
                        </Flex>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </VStack>
          </TabsContent>

          <TabsContent value="commits" className="flex-1 p-6 overflow-auto">
            <VStack className="max-w-4xl space-y-4">
              <Card>
                <CardContent className="p-4">
                  <Flex className="items-center gap-3">
                    <Box className="w-2 h-2 bg-green-500 rounded-full"></Box>
                    <Box className="flex-1">
                      <Text weight="medium">Implement drag and drop functionality for kanban boards</Text>
                      <Flex className="items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Text as="span">a1b2c3d4</Text>
                        <Text as="span">•</Text>
                        <Text as="span">John Doe</Text>
                        <Text as="span">•</Text>
                        <Text as="span">30 minutes ago</Text>
                      </Flex>
                    </Box>
                  </Flex>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <Flex className="items-center gap-3">
                    <Box className="w-2 h-2 bg-green-500 rounded-full"></Box>
                    <Box className="flex-1">
                      <Text weight="medium">Add TypeScript interfaces for drag and drop</Text>
                      <Flex className="items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Text as="span">b2c3d4e5</Text>
                        <Text as="span">•</Text>
                        <Text as="span">John Doe</Text>
                        <Text as="span">•</Text>
                        <Text as="span">1 hour ago</Text>
                      </Flex>
                    </Box>
                  </Flex>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <Flex className="items-center gap-3">
                    <Box className="w-2 h-2 bg-green-500 rounded-full"></Box>
                    <Box className="flex-1">
                      <Text weight="medium">Initial drag and drop setup</Text>
                      <Flex className="items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Text as="span">c3d4e5f6</Text>
                        <Text as="span">•</Text>
                        <Text as="span">John Doe</Text>
                        <Text as="span">•</Text>
                        <Text as="span">2 hours ago</Text>
                      </Flex>
                    </Box>
                  </Flex>
                </CardContent>
              </Card>
            </VStack>
          </TabsContent>

          <TabsContent value="changes" className="flex-1 overflow-auto">
            {selectedLines && (
              <Box className="mx-6 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Flex className="items-center justify-between">
                  <Box className="text-sm">
                    <Text as="span" weight="medium">
                      {selectedLines.lines.length} line{selectedLines.lines.length > 1 ? 's' : ''} selected in {selectedLines.file}
                    </Text>
                    <Text as="span" className="text-muted-foreground ml-2">
                      Add a comment about this code
                    </Text>
                  </Box>
                  <Flex className="gap-2">
                    <Button size="sm" onClick={addCodeComment} disabled={!codeCommentText.trim()}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Comment
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedLines(null)}
                      variant="ghost"
                    >
                      Clear
                    </Button>
                  </Flex>
                </Flex>
                {selectedLines && (
                  <VStack className="mt-3 space-y-3">
                    <Box className="bg-muted/30 rounded-lg overflow-hidden">
                      <Box className="text-xs text-muted-foreground px-3 py-2 bg-muted/50 border-b">
                        {selectedLines.file}
                      </Box>
                      {selectedLines.lines.map((line, index) => (
                        <Flex key={index} className={`items-center text-sm font-mono ${line.type === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                          line.type === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                            ''
                          }`}>
                          <Box className="w-12 text-center text-muted-foreground border-r border-border py-1">
                            {line.lineNumber}
                          </Box>
                          <Box className={`w-6 text-center ${line.type === 'addition' ? 'text-green-600' :
                            line.type === 'deletion' ? 'text-red-600' :
                              ''
                            }`}>
                            {line.type === 'addition' ? '+' :
                              line.type === 'deletion' ? '-' : ''}
                          </Box>
                          <Box className="flex-1 px-4 py-1">
                            {line.content}
                          </Box>
                        </Flex>
                      ))}
                    </Box>
                    <Textarea
                      placeholder="Add your comment about this code..."
                      value={codeCommentText}
                      onChange={(e) => setCodeCommentText(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </VStack>
                )}
              </Box>
            )}
            <VStack className="space-y-6">
              {mockFileChanges.map((file, fileIndex) => (
                <Card key={fileIndex} className="mx-6">
                  <CardHeader className="pb-3">
                    <Flex className="items-center justify-between">
                      <Flex className="items-center gap-2">
                        <Heading level={4} className="font-mono text-sm">{file.path}</Heading>
                      </Flex>
                      <Flex className="items-center gap-2 text-sm">
                        <Text as="span" className="text-green-600">+{file.additions}</Text>
                        <Text as="span" className="text-red-600">-{file.deletions}</Text>
                      </Flex>
                    </Flex>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Box className="bg-muted/30">
                      {file.changes.map((change, changeIndex) => (
                        <Flex
                          key={changeIndex}
                          className={`items-center text-sm font-mono cursor-pointer hover:bg-muted/70 transition-colors select-none ${change.type === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                            change.type === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                              ''
                            } ${selectedLines &&
                              selectedLines.file === file.path &&
                              selectedLines.lines.some(l => l.lineNumber === change.lineNumber)
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500'
                              : ''
                            }`}
                          onClick={(e) => handleLineSelection(file.path, change.lineNumber, change.content, change.type, e)}
                          title={`Click to select line ${change.lineNumber}. Hold Shift to extend selection.`}
                        >
                          <Box className="w-12 text-center text-muted-foreground border-r border-border py-1">
                            {change.lineNumber}
                          </Box>
                          <Box className={`w-6 text-center ${change.type === 'addition' ? 'text-green-600' :
                            change.type === 'deletion' ? 'text-red-600' :
                              ''
                            }`}>
                            {change.type === 'addition' ? '+' :
                              change.type === 'deletion' ? '-' : ''}
                          </Box>
                          <Box className="flex-1 px-4 py-1">
                            {change.content}
                          </Box>
                        </Flex>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </VStack>
          </TabsContent>
        </Tabs>
      </Box>
    </Flex>
  );
}