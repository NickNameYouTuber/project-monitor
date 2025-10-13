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
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              <h1 className="text-lg font-semibold">{filePath}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="w-4 h-4" />
              <span>{branch}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Card className="h-full">
          <CardContent className="p-6 h-full flex flex-col gap-4">
            <div className="flex-1">
              <Label>Содержимое файла</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-sm mt-2 min-h-[600px] resize-none"
                placeholder="Начните вводить код..."
              />
            </div>
            <div>
              <Label>Commit message</Label>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Update file"
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

