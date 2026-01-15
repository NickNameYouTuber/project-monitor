import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Label, Tabs, TabsContent, TabsList, TabsTrigger, Box, Flex, VStack, Heading, Text } from '@nicorp/nui';
import { ArrowLeft, Save, GitBranch, FileCode, Edit, Eye, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getFileContent } from '../api/repository-content';
import { updateFile } from '../api/repositories';
import { useNotifications } from '../hooks/useNotifications';
import { LoadingSpinner } from './loading-spinner';
import { FileTree } from './repository/FileTree';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiClient } from '../api/client';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism-tomorrow.css';

export function FileEditorPage() {
  const { repoId, '*': initialFilePath } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [filePath, setFilePath] = useState(initialFilePath || '');
  const [branch, setBranch] = useState('master');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [markdownMode, setMarkdownMode] = useState<'code' | 'preview'>('code');
  const [svgMode, setSvgMode] = useState<'code' | 'preview'>('preview');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [branches, setBranches] = useState<string[]>([]);

  // Функция для проверки бинарных изображений
  const isBinaryImage = (path: string) => {
    const ext = path?.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'].includes(ext || '');
  };

  // Загрузить список веток
  useEffect(() => {
    if (!repoId) return;

    const loadBranches = async () => {
      try {
        const { data } = await apiClient.get<string[]>(`/repositories/${repoId}/refs/branches`);
        setBranches(data);
      } catch (error) {
        console.error('Failed to load branches:', error);
      }
    };

    loadBranches();
  }, [repoId]);

  useEffect(() => {
    if (!repoId || !filePath) return;

    const loadFile = async () => {
      try {
        setIsLoading(true);
        setContent(''); // Очистить перед загрузкой!
        setOriginalContent('');
        setImageUrl('');
        setIsEditing(false);

        // Для бинарных изображений (кроме SVG) загрузить как blob
        if (isBinaryImage(filePath)) {
          const token = localStorage.getItem('access_token');
          const response = await fetch(`/api/repositories/${repoId}/file?ref=${branch}&path=${encodeURIComponent(filePath)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });

          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
          } else {
            toast.error('Ошибка при загрузке изображения');
          }

          setIsLoading(false);
          return;
        }

        const fileContent = await getFileContent(repoId, branch, filePath);
        setContent(fileContent);
        setOriginalContent(fileContent);
        setCommitMessage(`Update ${filePath.split('/').pop()}`);
      } catch (error) {
        showError('Ошибка при загрузке файла');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();

    // Cleanup: освободить blob URL при размонтировании
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [repoId, filePath, branch]);

  const handleSave = async () => {
    if (!repoId || !filePath) return;

    setIsSaving(true);
    try {
      await updateFile(repoId, branch, filePath, content, commitMessage);
      showSuccess('Файл сохранён');
      setOriginalContent(content);
      setIsEditing(false);
    } catch (error) {
      showError('Ошибка при сохранении файла');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setContent(originalContent);
    setIsEditing(false);
  };

  const handleBranchChange = (newBranch: string) => {
    setBranch(newBranch);
    // Файл автоматически перезагрузится через useEffect с зависимостью [branch]
  };

  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
      'py': 'python', 'java': 'java', 'json': 'json', 'md': 'markdown',
      'css': 'css', 'html': 'html', 'xml': 'xml', 'sql': 'sql',
      'sh': 'bash', 'yml': 'yaml', 'yaml': 'yaml', 'svg': 'xml',
    };
    return langMap[ext || ''] || 'text';
  };

  const getPrismLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, any> = {
      'js': languages.javascript,
      'jsx': languages.jsx,
      'ts': languages.typescript,
      'tsx': languages.tsx,
      'py': languages.python,
      'java': languages.java,
      'json': languages.json,
      'md': languages.markdown,
      'css': languages.css,
      'html': languages.markup,
      'xml': languages.markup,
      'sql': languages.sql,
      'sh': languages.bash,
      'yml': languages.yaml,
      'yaml': languages.yaml,
      'svg': languages.markup,
    };
    return langMap[ext || ''] || languages.javascript;
  };

  const isMarkdown = filePath?.endsWith('.md');
  const isSvg = filePath?.toLowerCase().endsWith('.svg');
  const isImage = (path: string) => {
    const ext = path?.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext || '');
  };

  return (
    <Flex className="h-screen bg-background">
      <Box className="w-64 border-r border-border flex-shrink-0 hidden md:block">
        <FileTree
          repoId={repoId || ''}
          branch={branch}
          currentFile={filePath}
          onFileSelect={setFilePath}
          onBranchChange={handleBranchChange}
          branches={branches}
        />
      </Box>

      <Flex className="flex-1 flex-col min-w-0">
        {isLoading ? (
          <Flex className="flex-1 items-center justify-center">
            <LoadingSpinner stages={['Loading File', 'Parse Content', 'Ready']} />
          </Flex>
        ) : (
          <>
            <Box className="border-b border-border px-4 py-3 flex-shrink-0">
              <Flex className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Flex className="items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Flex className="items-center gap-2 min-w-0 flex-1">
                    <FileCode className="w-5 h-5 flex-shrink-0" />
                    <Heading level={1} className="text-sm sm:text-base font-semibold truncate">{filePath.split('/').pop()}</Heading>
                  </Flex>
                </Flex>
                <Flex className="items-center gap-2">
                  {!isBinaryImage(filePath) && (
                    !isEditing ? (
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
                    )
                  )}
                </Flex>
              </Flex>
            </Box>

            <Box className="flex-1 overflow-hidden">
              {isBinaryImage(filePath) ? (
                // Бинарные изображения (PNG, JPG и т.д.) - только просмотр
                <Flex className="items-center justify-center h-full p-6 bg-muted/20">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={filePath}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  ) : (
                    <Text className="text-muted-foreground">Загрузка изображения...</Text>
                  )}
                </Flex>
              ) : (
                // Текстовые файлы, SVG, Markdown
                <Flex className="h-full flex-col">
                  {/* Табы для Markdown или SVG */}
                  {(isMarkdown || isSvg) && (
                    <Box className="border-b border-border px-4 py-2">
                      <Tabs
                        value={isMarkdown ? markdownMode : svgMode}
                        onValueChange={(v) => {
                          if (isMarkdown) setMarkdownMode(v as 'code' | 'preview');
                          if (isSvg) setSvgMode(v as 'code' | 'preview');
                        }}
                      >
                        <TabsList className="grid w-48 grid-cols-2">
                          <TabsTrigger value="code">Код</TabsTrigger>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </Box>
                  )}

                  <Box className="flex-1 overflow-auto p-4">
                    {isMarkdown && markdownMode === 'preview' ? (
                      // Markdown preview
                      <Box className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {content}
                        </ReactMarkdown>
                      </Box>
                    ) : isSvg && svgMode === 'preview' ? (
                      // SVG preview
                      <Flex className="items-center justify-center h-full bg-muted/20">
                        <div
                          dangerouslySetInnerHTML={{ __html: content }}
                          className="max-w-full max-h-full"
                        />
                      </Flex>
                    ) : isEditing ? (
                      // Режим редактирования с подсветкой синтаксиса
                      <Flex className="h-full flex-col gap-3">
                        <Box className="flex-1 overflow-auto border rounded-lg">
                          <Editor
                            value={content}
                            onValueChange={setContent}
                            highlight={(code) => highlight(code, getPrismLanguage(filePath), getLanguage(filePath))}
                            padding={16}
                            style={{
                              fontFamily: '"Fira Code", "Fira Mono", monospace',
                              fontSize: 14,
                              minHeight: '100%',
                              backgroundColor: '#1e1e1e',
                              color: '#d4d4d4',
                            }}
                            textareaClassName="focus:outline-none"
                            placeholder="Начните вводить код..."
                          />
                        </Box>
                        <VStack className="space-y-2">
                          <Label className="text-sm font-medium">Commit message</Label>
                          <Input
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            placeholder="Update file"
                          />
                        </VStack>
                      </Flex>
                    ) : (
                      // Режим просмотра с подсветкой синтаксиса
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
                  </Box>
                </Flex>
              )}
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
}

