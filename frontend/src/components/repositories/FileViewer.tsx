import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert,
} from '@mui/material';
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

  const renderImage = () => {
    if (!fileContent || !fileContent.binary) return null;
    
    const isImage = fileContent.name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i);
    if (!isImage) return null;
    
    return (
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <img 
          src={`data:image;base64,${fileContent.content}`}
          alt={fileContent.name}
          style={{ maxWidth: '100%', maxHeight: '500px' }}
        />
      </Box>
    );
  };

  const renderContent = () => {
    if (!fileContent) return null;
    
    // Handle binary files
    if (fileContent.binary) {
      // Check if it's an image that can be rendered
      const imageElement = renderImage();
      if (imageElement) return imageElement;
      
      // Other binary files
      return (
        <Alert severity="info">
          This is a binary file ({fileContent.size} bytes). Cannot display content.
        </Alert>
      );
    }
    
    // Handle text files
    const language = detectLanguage(fileContent.name);
    
    return (
      <Box sx={{ mt: 2, position: 'relative' }}>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{
            fontSize: '0.9rem',
            borderRadius: '4px',
            maxHeight: '70vh',
            overflow: 'auto',
          }}
        >
          {fileContent.content}
        </SyntaxHighlighter>
      </Box>
    );
  };

  if (!file) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="subtitle1" color="text.secondary" align="center">
          Select a file to view its content
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
        <Typography variant="h6">
          {file.name}
        </Typography>
        {file.last_commit && (
          <Typography variant="caption" display="block" color="text.secondary">
            Last modified in commit "{file.last_commit.message}" by {file.last_commit.author}
          </Typography>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        renderContent()
      )}
    </Paper>
  );
};

export default FileViewer;
