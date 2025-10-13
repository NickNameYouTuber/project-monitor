import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Save, GitBranch, FileCode } from 'lucide-react';
import { getFileContent } from '../api/repository-content';
import { updateFile } from '../api/repositories';
import { toast } from 'sonner';
import { LoadingSpinner } from './loading-spinner';

export function FileEditorPage() {
  const { repoId, '*': filePath } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState('master');
  const [content, setContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!repoId || !filePath) return;
    
    const loadFile = async () => {
      try {
        setIsLoading(true);
        const fileContent = await getFileContent(repoId, branch, filePath);
        setContent(fileContent);
        setCommitMessage(`Update ${filePath}`);
      } catch (error) {
        toast.error('Ошибка при загрузке файла');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [repoId, filePath, branch]);

  const handleSave = async () => {
    if (!repoId || !filePath) return;
    
    setIsSaving(true);
    try {
      await updateFile(repoId, branch, filePath, content, commitMessage);
      toast.success('Файл сохранён');
      navigate(-1);
    } catch (error) {
      toast.error('Ошибка при сохранении файла');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner stages={['Loading File', 'Parse Content', 'Ready']} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileCode className="w-5 h-5 flex-shrink-0" />
              <h1 className="text-base sm:text-lg font-semibold truncate">{filePath}</h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="w-4 h-4" />
              <span>{branch}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="flex-1 sm:flex-none">
              Отмена
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="h-full flex flex-col gap-4 max-w-7xl mx-auto">
          <div className="flex-1 min-h-0">
            <Label className="text-sm font-medium">Содержимое файла</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-xs sm:text-sm mt-2 h-[calc(100vh-250px)] resize-none"
              placeholder="Начните вводить код..."
            />
          </div>
          <div className="flex-shrink-0">
            <Label className="text-sm font-medium">Commit message</Label>
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Update file"
              className="mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

