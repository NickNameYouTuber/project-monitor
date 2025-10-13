import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { listFiles, type FileEntry } from '../../api/repository-content';
import { ScrollArea } from '../ui/scroll-area';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeProps {
  repoId: string;
  branch: string;
  currentFile?: string;
  onFileSelect: (path: string) => void;
}

export function FileTree({ repoId, branch, currentFile, onFileSelect }: FileTreeProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));

  useEffect(() => {
    loadTree();
  }, [repoId, branch]);

  const loadTree = async () => {
    try {
      const allFiles = await loadAllFilesRecursively('');
      const treeStructure = buildTree(allFiles);
      setTree(treeStructure);
    } catch {}
  };

  const loadAllFilesRecursively = async (path: string): Promise<FileEntry[]> => {
    const entries = await listFiles(repoId, branch, path || undefined);
    const allFiles: FileEntry[] = [];

    for (const entry of entries) {
      allFiles.push(entry);
      if (entry.type === 'tree') {
        // Рекурсивно загрузить содержимое папки
        const subFiles = await loadAllFilesRecursively(entry.path);
        allFiles.push(...subFiles);
      }
    }

    return allFiles;
  };

  const buildTree = (files: FileEntry[]): FileNode[] => {
    const root: FileNode[] = [];
    const folders = new Map<string, FileNode>();

    files.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (isLast && file.type === 'blob') {
          currentLevel.push({
            name: part,
            path: file.path,
            type: 'file'
          });
        } else {
          let folder = folders.get(currentPath);
          if (!folder) {
            folder = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: []
            };
            folders.set(currentPath, folder);
            currentLevel.push(folder);
          }
          currentLevel = folder.children!;
        }
      });
    });

    return root;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const colorMap: Record<string, string> = {
      'js': 'text-yellow-500',
      'ts': 'text-blue-500',
      'tsx': 'text-blue-400',
      'jsx': 'text-yellow-400',
      'json': 'text-green-500',
      'md': 'text-gray-400',
      'css': 'text-pink-500',
      'html': 'text-orange-500',
      'py': 'text-blue-600',
      'java': 'text-red-500',
    };
    return colorMap[ext || ''] || 'text-gray-500';
  };

  const TreeNode = ({ node, level }: { node: FileNode; level: number }) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = currentFile === node.path;

    return (
      <div>
        <div
          className={`flex items-center gap-1 py-1 px-2 hover:bg-accent rounded cursor-pointer ${
            isSelected ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
              )}
              <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
            </>
          ) : (
            <>
              <div className="w-3" />
              <File className={`w-4 h-4 flex-shrink-0 ${getFileIcon(node.name)}`} />
            </>
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.path} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <div className="text-sm font-medium mb-3">Files</div>
        {tree.map(node => (
          <TreeNode key={node.path} node={node} level={0} />
        ))}
      </div>
    </ScrollArea>
  );
}

