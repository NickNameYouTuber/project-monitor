import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../../services/api';

interface GitFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number | null;
  last_commit: {
    hash: string;
    message: string;
    date: string;
    author: string;
  };
}

interface GitContent {
  name: string;
  path: string;
  content: string;
  encoding: string;
  size: number;
  binary: boolean;
}

interface FileViewerProps {
  repositoryId: string;
  file: GitFile | null;
}

const FileViewer: React.FC<FileViewerProps> = ({ repositoryId, file }) => {
  const [fileContent, setFileContent] = useState<GitContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type === 'file') {
      fetchFileContent();
    } else {
      setFileContent(null);
    }
  }, [file, repositoryId]);

  const fetchFileContent = async () => {
    if (!file) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/repositories/${repositoryId}/content/${file.path}`);
      setFileContent(response.data);
    } catch (err) {
      console.error('Error fetching file content:', err);
      setError('Failed to load file content. The file might be too large or contain binary data.');
    } finally {
      setLoading(false);
    }
  };

  const detectLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'sql': 'sql',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'kt': 'kotlin',
      'rs': 'rust',
      'swift': 'swift',
      'dart': 'dart',
    };
    
    return extension && languageMap[extension] ? languageMap[extension] : 'plaintext';
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg shadow">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586A2 2 0 0114.172 4l2.828 2.828A2 2 0 0118 8.414V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-center">Select a file to view its contents</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-2xl" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!fileContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg shadow">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-gray-500 text-center">File content is not available</p>
      </div>
    );
  }

  if (fileContent.binary) {
    if (fileContent.name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i)) {
      return (
        <div className="flex flex-col h-full bg-gray-50 rounded-lg shadow overflow-auto">
          <div className="p-2 border-b border-gray-200 flex justify-between items-center bg-white">
            <span className="font-medium truncate">{fileContent.name}</span>
            <div className="text-sm text-gray-500">Binary Image File</div>
          </div>
          <div className="flex-grow flex justify-center items-center p-4 overflow-auto">
            <img 
              src={`data:image;base64,${fileContent.content}`} 
              alt={fileContent.name} 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg shadow">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-500 text-center">Binary file content cannot be displayed</p>
        <p className="text-gray-400 text-sm mt-1">File type: {fileContent.name.split('.').pop()}</p>
      </div>
    );
  }

  const language = detectLanguage(fileContent.name);

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg shadow overflow-hidden">
      <div className="p-2 border-b border-gray-200 flex justify-between items-center bg-white">
        <span className="font-medium truncate">{fileContent.name}</span>
        <div className="text-sm text-gray-500">{language || 'Plain Text'}</div>
      </div>
      <div className="flex-grow overflow-auto bg-gray-900 text-white font-mono text-sm">
        <SyntaxHighlighter 
          language={language} 
          style={vscDarkPlus} 
          customStyle={{ margin: 0, height: '100%', background: 'rgb(30, 30, 30)' }}
          showLineNumbers
        >
          {fileContent.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default FileViewer;
