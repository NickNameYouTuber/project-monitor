import React, { useEffect, useState } from 'react';
import { getCommitDiffDetails, type CommitDiff, type FileDiff } from '../../api/repository-content';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { File, Plus, Minus, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface CommitDiffViewerProps {
  repoId: string;
  commitSha: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommitDiffViewer({ repoId, commitSha, isOpen, onClose }: CommitDiffViewerProps) {
  const [diff, setDiff] = useState<CommitDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !commitSha) return;
    
    const loadDiff = async () => {
      setIsLoading(true);
      try {
        const data = await getCommitDiffDetails(repoId, commitSha);
        setDiff(data);
      } catch (error) {
        toast.error('Ошибка загрузки diff');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDiff();
  }, [repoId, commitSha, isOpen]);

  const renderDiff = (file: FileDiff) => {
    const lines = file.patch.split('\n');
    
    return (
      <div className="font-mono text-xs bg-background">
        {lines.map((line, idx) => {
          let bgColor = '';
          let textColor = '';
          let icon = null;
          
          if (line.startsWith('+') && !line.startsWith('+++')) {
            bgColor = 'bg-green-500/10';
            textColor = 'text-green-400';
            icon = <Plus className="w-3 h-3 text-green-500" />;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bgColor = 'bg-red-500/10';
            textColor = 'text-red-400';
            icon = <Minus className="w-3 h-3 text-red-500" />;
          } else if (line.startsWith('@@')) {
            bgColor = 'bg-blue-500/10';
            textColor = 'text-blue-400';
          } else if (line.startsWith('diff --git') || line.startsWith('index ') || 
                     line.startsWith('---') || line.startsWith('+++')) {
            textColor = 'text-muted-foreground';
          }
          
          return (
            <div key={idx} className={`flex items-start gap-2 px-3 py-0.5 ${bgColor} ${textColor}`}>
              <span className="w-4 flex-shrink-0">{icon}</span>
              <span className="flex-1 whitespace-pre overflow-x-auto">{line}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'ADD': return <Plus className="w-4 h-4 text-green-500" />;
      case 'DELETE': return <Minus className="w-4 h-4 text-red-500" />;
      case 'MODIFY': return <Edit className="w-4 h-4 text-yellow-500" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const getChangeBadgeVariant = (changeType: string) => {
    switch (changeType) {
      case 'ADD': return 'default';
      case 'DELETE': return 'destructive';
      case 'MODIFY': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Commit: {commitSha.substring(0, 7)}
          </DialogTitle>
          {diff && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">{diff.commit.message}</p>
              <p className="text-xs mt-1">
                {diff.commit.author} • {new Date(diff.commit.date).toLocaleString()}
              </p>
            </div>
          )}
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-150px)]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка diff...</div>
          ) : diff ? (
            <div className="space-y-4">
              {diff.files.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Нет изменений в коммите
                </div>
              ) : (
                diff.files.map((file, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 flex items-center gap-2">
                      {getChangeIcon(file.changeType)}
                      <span className="font-medium text-sm flex-1">
                        {file.changeType === 'RENAME' 
                          ? `${file.oldPath} → ${file.newPath}`
                          : file.newPath || file.oldPath
                        }
                      </span>
                      <Badge variant={getChangeBadgeVariant(file.changeType) as any} className="text-xs">
                        {file.changeType}
                      </Badge>
                    </div>
                    <div className="overflow-x-auto">
                      {renderDiff(file)}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

