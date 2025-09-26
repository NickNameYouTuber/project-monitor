import React, { useState } from 'react';
import { ArrowLeft, GitBranch, Eye, MessageSquare, Check, X, Plus, Send, GitMerge, User, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Merge Request #42</span>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-medium mb-2">
              Implement drag and drop functionality for kanban boards
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                <code className="bg-muted px-2 py-1 rounded text-xs">{branch}</code>
                <span>→</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">main</code>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>Created by John Doe</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>2 hours ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="text-green-600">+{totalAdditions} additions</span>
          <span className="text-red-600">-{totalDeletions} deletions</span>
          <span className="text-muted-foreground">{mockFileChanges.length} files changed</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commits">Commits (3)</TabsTrigger>
            <TabsTrigger value="changes">Changes ({mockFileChanges.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl space-y-6">
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
                    <div key={comment.id} className="space-y-3">
                      {comment.type === 'system' ? (
                        <div className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <span>{comment.content}</span>
                            <div className="text-xs mt-1">
                              {comment.timestamp.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ) : comment.type === 'code' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {comment.author.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{comment.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {comment.timestamp.toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Code snippet styled like Changes tab */}
                          {comment.changes && (
                            <div className="ml-8 mb-2 bg-muted/30 rounded-lg overflow-hidden">
                              <div className="text-xs text-muted-foreground px-3 py-2 bg-muted/50 border-b">
                                {comment.changes.file}
                              </div>
                              {comment.changes.code.map((codeLine, index) => {
                                // Determine line type from original file changes
                                const lineNumber = comment.changes!.lines[index];
                                const fileChange = mockFileChanges.find(f => f.path === comment.changes!.file);
                                const originalLine = fileChange?.changes.find(c => c.lineNumber === lineNumber);
                                const lineType = originalLine?.type || 'context';
                                
                                return (
                                  <div key={index} className={`flex items-center text-sm font-mono ${
                                    lineType === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                                    lineType === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                                    ''
                                  }`}>
                                    <div className="w-12 text-center text-muted-foreground border-r border-border py-1">
                                      {lineNumber}
                                    </div>
                                    <div className={`w-6 text-center ${
                                      lineType === 'addition' ? 'text-green-600' :
                                      lineType === 'deletion' ? 'text-red-600' :
                                      ''
                                    }`}>
                                      {lineType === 'addition' ? '+' : 
                                       lineType === 'deletion' ? '-' : ''}
                                    </div>
                                    <div className="flex-1 px-4 py-1">
                                      {codeLine}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          <p className="text-sm bg-muted p-3 rounded-lg ml-8">
                            {comment.content}
                          </p>
                          
                          {/* Reply input for code comments */}
                          <div className="ml-8">
                            {replyingTo === comment.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Reply to this comment..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[60px]"
                                />
                                <div className="flex justify-end gap-2">
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
                                </div>
                              </div>
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
                            <div className="mt-2 space-y-2">
                              {getCommentReplies(comment.id).map(reply => (
                                <div key={reply.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarFallback className="text-xs">
                                        {reply.author.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{reply.author}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {reply.timestamp.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm bg-muted p-2 rounded ml-7">
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
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
                              {comment.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm bg-muted p-3 rounded-lg ml-8">
                            {comment.content}
                          </p>
                          
                          {/* Reply input for regular comments */}
                          <div className="ml-8">
                            {replyingTo === comment.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Reply to this comment..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[60px]"
                                />
                                <div className="flex justify-end gap-2">
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
                                </div>
                              </div>
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
                            <div className="mt-2 space-y-2">
                              {getCommentReplies(comment.id).map(reply => (
                                <div key={reply.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5">
                                      <AvatarFallback className="text-xs">
                                        {reply.author.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{reply.author}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {reply.timestamp.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm bg-muted p-2 rounded ml-7">
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <Separator />

                  {/* Add Comment */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">You</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">Add a comment</span>
                    </div>
                    <Textarea
                      placeholder="Write a comment..."
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

                  {/* Code comment dialog */}
                  {selectedLines && (
                    <Card className="border-primary/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Comment on selected code</CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {selectedLines.lines.length} line{selectedLines.lines.length > 1 ? 's' : ''} selected
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                          <div className="text-xs text-muted-foreground px-3 py-2 bg-muted/50 border-b">
                            {selectedLines.file}
                          </div>
                          {selectedLines.lines.map((line, index) => (
                            <div key={index} className={`flex items-center text-sm font-mono ${
                              line.type === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                              line.type === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                              ''
                            }`}>
                              <div className="w-12 text-center text-muted-foreground border-r border-border py-1">
                                {line.lineNumber}
                              </div>
                              <div className={`w-6 text-center ${
                                line.type === 'addition' ? 'text-green-600' :
                                line.type === 'deletion' ? 'text-red-600' :
                                ''
                              }`}>
                                {line.type === 'addition' ? '+' : 
                                 line.type === 'deletion' ? '-' : ''}
                              </div>
                              <div className="flex-1 px-4 py-1">
                                {line.content}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Textarea
                          placeholder="Add your comment about this code..."
                          value={codeCommentText}
                          onChange={(e) => setCodeCommentText(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex justify-end gap-2">
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
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="commits" className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Implement drag and drop functionality for kanban boards</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>a1b2c3d4</span>
                        <span>•</span>
                        <span>John Doe</span>
                        <span>•</span>
                        <span>30 minutes ago</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Add TypeScript interfaces for drag and drop</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>b2c3d4e5</span>
                        <span>•</span>
                        <span>John Doe</span>
                        <span>•</span>
                        <span>1 hour ago</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Initial drag and drop setup</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>c3d4e5f6</span>
                        <span>•</span>
                        <span>John Doe</span>
                        <span>•</span>
                        <span>2 hours ago</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="changes" className="flex-1 overflow-auto">
            {selectedLines && (
              <div className="mx-6 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">
                      {selectedLines.lines.length} line{selectedLines.lines.length > 1 ? 's' : ''} selected in {selectedLines.file}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      Add a comment about this code
                    </span>
                  </div>
                  <div className="flex gap-2">
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
                  </div>
                </div>
                {selectedLines && (
                  <div className="mt-3 space-y-3">
                    <div className="bg-muted/30 rounded-lg overflow-hidden">
                      <div className="text-xs text-muted-foreground px-3 py-2 bg-muted/50 border-b">
                        {selectedLines.file}
                      </div>
                      {selectedLines.lines.map((line, index) => (
                        <div key={index} className={`flex items-center text-sm font-mono ${
                          line.type === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                          line.type === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                          ''
                        }`}>
                          <div className="w-12 text-center text-muted-foreground border-r border-border py-1">
                            {line.lineNumber}
                          </div>
                          <div className={`w-6 text-center ${
                            line.type === 'addition' ? 'text-green-600' :
                            line.type === 'deletion' ? 'text-red-600' :
                            ''
                          }`}>
                            {line.type === 'addition' ? '+' : 
                             line.type === 'deletion' ? '-' : ''}
                          </div>
                          <div className="flex-1 px-4 py-1">
                            {line.content}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Add your comment about this code..."
                      value={codeCommentText}
                      onChange={(e) => setCodeCommentText(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="space-y-6">
              {mockFileChanges.map((file, fileIndex) => (
                <Card key={fileIndex} className="mx-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono text-sm">{file.path}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">+{file.additions}</span>
                        <span className="text-red-600">-{file.deletions}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="bg-muted/30">
                      {file.changes.map((change, changeIndex) => (
                        <div 
                          key={changeIndex}
                          className={`flex items-center text-sm font-mono cursor-pointer hover:bg-muted/70 transition-colors select-none ${
                            change.type === 'addition' ? 'bg-green-50 dark:bg-green-900/20' :
                            change.type === 'deletion' ? 'bg-red-50 dark:bg-red-900/20' :
                            ''
                          } ${
                            selectedLines && 
                            selectedLines.file === file.path && 
                            selectedLines.lines.some(l => l.lineNumber === change.lineNumber) 
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500' 
                              : ''
                          }`}
                          onClick={(e) => handleLineSelection(file.path, change.lineNumber, change.content, change.type, e)}
                          title={`Click to select line ${change.lineNumber}. Hold Shift to extend selection.`}
                        >
                          <div className="w-12 text-center text-muted-foreground border-r border-border py-1">
                            {change.lineNumber}
                          </div>
                          <div className={`w-6 text-center ${
                            change.type === 'addition' ? 'text-green-600' :
                            change.type === 'deletion' ? 'text-red-600' :
                            ''
                          }`}>
                            {change.type === 'addition' ? '+' : 
                             change.type === 'deletion' ? '-' : ''}
                          </div>
                          <div className="flex-1 px-4 py-1">
                            {change.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}