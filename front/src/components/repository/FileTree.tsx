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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadedFolders, setLoadedFolders] = useState<Set<string>>(new Set(['']));
  const [loading, setLoading] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFolder('');
  }, [repoId, branch]);

  const loadFolder = async (folderPath: string) => {
    if (loadedFolders.has(folderPath)) return;
    
    setLoading(prev => new Set(prev).add(folderPath));
    
    try {
      const files = await listFiles(repoId, branch, folderPath || undefined);
      
      setTree(prevTree => {
        const newTree = [...prevTree];
        
        if (folderPath === '') {
          // Корневая директория
          return files.map(f => ({
            name: f.name || f.path,
            path: f.path,
            type: f.type === 'tree' ? 'folder' : 'file',
            children: f.type === 'tree' ? [] : undefined
          }));
        } else {
          // Вложенная директория - нужно найти и обновить
          const updateNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
              if (node.path === folderPath) {
                return {
                  ...node,
                  children: files.map(f => ({
                    name: f.name || f.path.split('/').pop() || f.path,
                    path: f.path,
                    type: f.type === 'tree' ? 'folder' : 'file',
                    children: f.type === 'tree' ? [] : undefined
                  }))
                };
              }
              if (node.children) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          };
          
          return updateNode(newTree);
        }
      });
      
      setLoadedFolders(prev => new Set(prev).add(folderPath));
    } catch (error) {
      console.error('Error loading folder:', error);
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderPath);
        return newSet;
      });
    }
  };

  const toggleFolder = async (path: string) => {
    const isExpanded = expandedFolders.has(path);
    
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
    
    if (!isExpanded && !loadedFolders.has(path)) {
      await loadFolder(path);
    }
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

