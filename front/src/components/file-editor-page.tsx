import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Save, GitBranch, FileCode, Edit, Eye, Image as ImageIcon } from 'lucide-react';
import { getFileContent } from '../api/repository-content';
import { updateFile } from '../api/repositories';
import { toast } from 'sonner';
import { LoadingSpinner } from './loading-spinner';
import { FileTree } from './repository/FileTree';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function FileEditorPage() {
  const { repoId, '*': initialFilePath } = useParams();
  const navigate = useNavigate();
  const [filePath, setFilePath] = useState(initialFilePath || '');
  const [branch, setBranch] = useState('master');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [markdownMode, setMarkdownMode] = useState<'code' | 'preview'>('code');

  useEffect(() => {
    if (!repoId || !filePath) return;
    
    const loadFile = async () => {
      try {
        setIsLoading(true);
        setIsEditing(false);
        const fileContent = await getFileContent(repoId, branch, filePath);
        setContent(fileContent);
        setOriginalContent(fileContent);
        setCommitMessage(`Update ${filePath.split('/').pop()}`);
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
      setOriginalContent(content);
      setIsEditing(false);
    } catch (error) {
      toast.error('Ошибка при сохранении файла');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setContent(originalContent);
    setIsEditing(false);
  };

  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
      'py': 'python', 'java': 'java', 'json': 'json', 'md': 'markdown',
      'css': 'css', 'html': 'html', 'xml': 'xml', 'sql': 'sql',
      'sh': 'bash', 'yml': 'yaml', 'yaml': 'yaml',
    };
    return langMap[ext || ''] || 'text';
  };

  const isMarkdown = filePath?.endsWith('.md');
  const isImage = (path: string) => {
    const ext = path?.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext || '');
  };

  if (isLoading) {
    return <LoadingSpinner stages={['Loading File', 'Parse Content', 'Ready']} />;
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 border-r border-border flex-shrink-0 hidden md:block">
        <FileTree
          repoId={repoId || ''}
          branch={branch}
          currentFile={filePath}
          onFileSelect={setFilePath}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileCode className="w-5 h-5 flex-shrink-0" />
                <h1 className="text-sm sm:text-base font-semibold truncate">{filePath.split('/').pop()}</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <GitBranch className="w-3 h-3" />
                <span>{branch}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    Отмена
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {isImage(filePath) ? (
            <div className="flex items-center justify-center h-full p-6 bg-muted/20">
              <img
                src={`/api/repositories/${repoId}/file?ref=${branch}&path=${encodeURIComponent(filePath)}`}
                alt={filePath}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {isMarkdown && (
                <div className="border-b border-border px-4 py-2">
                  <Tabs value={markdownMode} onValueChange={(v) => setMarkdownMode(v as 'code' | 'preview')}>
                    <TabsList className="grid w-48 grid-cols-2">
                      <TabsTrigger value="code">Код</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}

              <div className="flex-1 overflow-auto p-4">
                {isMarkdown && markdownMode === 'preview' ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : isEditing ? (
                  <div className="h-full flex flex-col gap-3">
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="font-mono text-sm flex-1 resize-none"
                      placeholder="Начните вводить код..."
                    />
                    <div>
                      <Label className="text-sm font-medium">Commit message</Label>
                      <Input
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Update file"
                        className="mt-2"
                      />
                    </div>
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={getLanguage(filePath)}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      padding: '1rem',
                    }}
                    showLineNumbers
                  >
                    {content}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

