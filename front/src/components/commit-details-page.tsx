import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, ScrollArea, Box, Flex, VStack, Heading, Text } from '@nicorp/nui';
import { ArrowLeft, Plus, Minus, Edit, File as FileIcon, GitCommit } from 'lucide-react';
import { getCommitDiffDetails, type CommitDiff, type FileDiff } from '../api/repository-content';
import { useNotifications } from '../hooks/useNotifications';
import { LoadingSpinner } from './loading-spinner';

interface ParsedDiff {
  chunks: DiffChunk[];
  isBinary: boolean;
}

interface DiffChunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

function parsePatch(patch: string): ParsedDiff {
  const lines = patch.split('\n');

  // Проверить на бинарный файл
  if (lines.some(l => l.includes('Binary files differ'))) {
    return { chunks: [], isBinary: true };
  }

  // Убрать техническую информацию
  const filteredLines = lines.filter(line =>
    !line.startsWith('diff --git') &&
    !line.startsWith('index ') &&
    !line.startsWith('---') &&
    !line.startsWith('+++') &&
    !line.startsWith('deleted file mode') &&
    !line.startsWith('new file mode') &&
    line.trim() !== ''
  );

  // Парсить chunks (начинаются с @@)
  const chunks: DiffChunk[] = [];
  let currentChunk: DiffChunk | null = null;
  let oldLineNo = 0;
  let newLineNo = 0;

  for (const line of filteredLines) {
    if (line.startsWith('@@')) {
      // Парсить @@ -1,19 +1,20 @@
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (match) {
        if (currentChunk) chunks.push(currentChunk);

        oldLineNo = parseInt(match[1]);
        newLineNo = parseInt(match[3]);

        currentChunk = {
          oldStart: oldLineNo,
          oldLines: match[2] ? parseInt(match[2]) : 1,
          newStart: newLineNo,
          newLines: match[4] ? parseInt(match[4]) : 1,
          lines: []
        };
      }
    } else if (currentChunk) {
      if (line.startsWith('+')) {
        currentChunk.lines.push({
          type: 'add',
          content: line.substring(1),
          newLineNo: newLineNo++
        });
      } else if (line.startsWith('-')) {
        currentChunk.lines.push({
          type: 'delete',
          content: line.substring(1),
          oldLineNo: oldLineNo++
        });
      } else if (line.startsWith(' ')) {
        currentChunk.lines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNo: oldLineNo++,
          newLineNo: newLineNo++
        });
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return { chunks, isBinary: false };
}

function DiffView({ file }: { file: FileDiff }) {
  const parsed = parsePatch(file.patch);

  if (parsed.isBinary) {
    return (
      <Flex className="items-center gap-2 text-sm text-muted-foreground italic p-3 bg-muted/30 rounded">
        <FileIcon className="w-4 h-4" />
        <Text as="span">
          Бинарный файл {
            file.changeType === 'ADD' ? 'добавлен' :
              file.changeType === 'DELETE' ? 'удалён' :
                'изменён'
          }
        </Text>
      </Flex>
    );
  }

  if (file.changeType === 'DELETE') {
    const lineCount = file.oldContent.split('\n').length;
    return (
      <Box className="text-sm text-muted-foreground p-3 bg-red-500/5 rounded border border-red-500/20">
        <Text as="span">{lineCount} {lineCount === 1 ? 'строка удалена' : lineCount < 5 ? 'строки удалено' : 'строк удалено'}</Text>
      </Box>
    );
  }

  if (file.changeType === 'ADD') {
    const lineCount = file.newContent.split('\n').filter(l => l.trim()).length;
    return (
      <VStack className="space-y-2">
        <Box className="text-sm text-muted-foreground p-3 bg-green-500/5 rounded border border-green-500/20">
          <Text as="span">{lineCount} {lineCount === 1 ? 'строка добавлена' : lineCount < 5 ? 'строки добавлено' : 'строк добавлено'}</Text>
        </Box>
        {parsed.chunks.map((chunk, idx) => (
          <Box key={idx} className="border rounded-lg overflow-hidden bg-background">
            <Box className="font-mono text-xs">
              {chunk.lines.map((line, lineIdx) => (
                <Flex
                  key={lineIdx}
                  className="items-start gap-3 px-4 py-0.5 bg-green-500/10"
                >
                  <Flex className="gap-2 text-muted-foreground select-none min-w-[60px]">
                    <Text as="span" className="w-8 text-right">{line.newLineNo || ''}</Text>
                  </Flex>
                  <Text as="span" className="text-green-500 w-4 flex-shrink-0">+</Text>
                  <Box as="code" className="flex-1 whitespace-pre overflow-x-auto">{line.content}</Box>
                </Flex>
              ))}
            </Box>
          </Box>
        ))}
      </VStack>
    );
  }

  return (
    <VStack className="space-y-2">
      {parsed.chunks.map((chunk, idx) => (
        <Box key={idx} className="border rounded-lg overflow-hidden bg-background">
          <Box className="font-mono text-xs">
            {chunk.lines.map((line, lineIdx) => (
              <Flex
                key={lineIdx}
                className={`items-start gap-3 px-4 py-1 ${line.type === 'add' ? 'bg-green-500/10' :
                  line.type === 'delete' ? 'bg-red-500/10' :
                    ''
                  }`}
              >
                {/* Номера строк */}
                <Flex className="gap-2 text-muted-foreground select-none min-w-[80px] text-xs">
                  <Text as="span" className="w-8 text-right">
                    {line.oldLineNo || ''}
                  </Text>
                  <Text as="span" className="w-8 text-right">
                    {line.newLineNo || ''}
                  </Text>
                </Flex>

                {/* Индикатор */}
                <Text as="span" className={`w-4 flex-shrink-0 ${line.type === 'add' ? 'text-green-500' :
                  line.type === 'delete' ? 'text-red-500' :
                    'text-muted-foreground'
                  }`}>
                  {line.type === 'add' ? '+' :
                    line.type === 'delete' ? '-' :
                      ' '}
                </Text>

                {/* Содержимое строки */}
                <Box as="code" className="flex-1 whitespace-pre overflow-x-auto">
                  {line.content}
                </Box>
              </Flex>
            ))}
          </Box>
        </Box>
      ))}
    </VStack>
  );
}

function FileGroup({ type, files }: { type: 'added' | 'modified' | 'deleted'; files: FileDiff[] }) {
  if (files.length === 0) return null;

  const config = {
    added: {
      title: 'Добавленные файлы',
      icon: <Plus className="w-5 h-5 text-green-500" />,
      color: 'border-green-500/20 bg-green-500/5'
    },
    modified: {
      title: 'Изменённые файлы',
      icon: <Edit className="w-5 h-5 text-yellow-500" />,
      color: 'border-yellow-500/20 bg-yellow-500/5'
    },
    deleted: {
      title: 'Удалённые файлы',
      icon: <Minus className="w-5 h-5 text-red-500" />,
      color: 'border-red-500/20 bg-red-500/5'
    }
  }[type];

  return (
    <Card className={config.color}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {config.icon}
          {config.title}
          <Badge variant="outline" className="ml-auto">{files.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {files.map((file, idx) => (
          <VStack key={idx} className="space-y-2">
            <Flex className="font-medium text-sm items-center gap-2">
              <FileIcon className="w-4 h-4" />
              <Text as="span">{file.changeType === 'DELETE' ? file.oldPath : (file.newPath || file.oldPath)}</Text>
            </Flex>
            <DiffView file={file} />
          </VStack>
        ))}
      </CardContent>
    </Card>
  );
}

export function CommitDetailsPage() {
  const { repoId, commitSha } = useParams();
  const navigate = useNavigate();
  const { showError } = useNotifications();
  const [diff, setDiff] = useState<CommitDiff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!repoId || !commitSha) return;

    const loadDiff = async () => {
      setIsLoading(true);
      try {
        const data = await getCommitDiffDetails(repoId, commitSha);
        setDiff(data);
      } catch (error) {
        showError('Ошибка загрузки коммита');
      } finally {
        setIsLoading(false);
      }
    };

    loadDiff();
  }, [repoId, commitSha]);

  const groupedFiles = useMemo(() => {
    if (!diff) return { added: [], modified: [], deleted: [], renamed: [] };

    return {
      added: diff.files.filter(f => f.changeType === 'ADD'),
      modified: diff.files.filter(f => f.changeType === 'MODIFY'),
      deleted: diff.files.filter(f => f.changeType === 'DELETE'),
      renamed: diff.files.filter(f => f.changeType === 'RENAME'),
    };
  }, [diff]);

  const summary = useMemo(() => {
    const parts = [];
    if (groupedFiles.added.length > 0) {
      const count = groupedFiles.added.length;
      parts.push(`${count} ${count === 1 ? 'файл добавлен' : 'файлов добавлено'}`);
    }
    if (groupedFiles.modified.length > 0) {
      const count = groupedFiles.modified.length;
      parts.push(`${count} ${count === 1 ? 'файл изменён' : 'файлов изменено'}`);
    }
    if (groupedFiles.deleted.length > 0) {
      const count = groupedFiles.deleted.length;
      parts.push(`${count} ${count === 1 ? 'файл удалён' : 'файлов удалено'}`);
    }
    if (groupedFiles.renamed.length > 0) {
      const count = groupedFiles.renamed.length;
      parts.push(`${count} ${count === 1 ? 'файл переименован' : 'файлов переименовано'}`);
    }

    return parts.join(', ') || 'Нет изменений';
  }, [groupedFiles]);

  if (isLoading) {
    return <LoadingSpinner stages={['Loading Commit', 'Parsing Diff', 'Ready']} />;
  }

  if (!diff) {
    return (
      <Flex className="h-screen items-center justify-center">
        <Text className="text-muted-foreground">Коммит не найден</Text>
      </Flex>
    );
  }

  return (
    <Flex className="h-screen flex-col bg-background">
      {/* Хедер */}
      <Box className="border-b px-6 py-4 bg-muted/30">
        <VStack className="max-w-7xl mx-auto space-y-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к репозиторию
          </Button>

          <Flex className="items-start gap-3">
            <GitCommit className="w-6 h-6 text-primary mt-1" />
            <Box className="flex-1">
              <Flex className="items-center gap-3 mb-2">
                <Heading level={1} className="text-2xl font-bold">
                  Commit {commitSha?.substring(0, 7)}
                </Heading>
                <Box as="code" className="px-3 py-1 bg-muted rounded text-xs font-mono">
                  {commitSha}
                </Box>
              </Flex>
              <Text className="text-lg mb-2">{diff.commit.message}</Text>
              <Flex className="items-center gap-4 text-sm text-muted-foreground">
                <Text as="span">{diff.commit.author}</Text>
                <Text as="span">•</Text>
                <Text as="span">{new Date(diff.commit.date).toLocaleString()}</Text>
              </Flex>
            </Box>
          </Flex>
        </VStack>
      </Box>

      {/* Контент */}
      <Box className="flex-1 overflow-auto">
        <Box className="p-6">
          <VStack className="max-w-7xl mx-auto space-y-6">
            {/* Сводка изменений */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Сводка изменений</CardTitle>
              </CardHeader>
              <CardContent>
                <Flex className="items-center gap-2">
                  <Text as="span" className="text-2xl">📊</Text>
                  <Text as="span" className="text-sm">{summary}</Text>
                </Flex>
              </CardContent>
            </Card>

            {/* Группы файлов */}
            <FileGroup type="modified" files={groupedFiles.modified} />
            <FileGroup type="added" files={groupedFiles.added} />
            <FileGroup type="deleted" files={groupedFiles.deleted} />

            {groupedFiles.renamed.length > 0 && (
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Edit className="w-5 h-5 text-blue-500" />
                    Переименованные файлы
                    <Badge variant="outline" className="ml-auto">{groupedFiles.renamed.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groupedFiles.renamed.map((file, idx) => (
                    <Flex key={idx} className="items-center gap-2 text-sm">
                      <FileIcon className="w-4 h-4" />
                      <Text as="span">{file.oldPath}</Text>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                      <Text as="span" className="font-medium">{file.newPath}</Text>
                    </Flex>
                  ))}
                </CardContent>
              </Card>
            )}

            {diff.files.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Нет изменений в этом коммите
                </CardContent>
              </Card>
            )}
          </VStack>
        </Box>
      </Box>
    </Flex>
  );
}

