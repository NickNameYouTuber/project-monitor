import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Paper, 
  Typography, 
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Folder as FolderIcon, 
  InsertDriveFile as FileIcon,
  NavigateNext as NavigateNextIcon 
} from '@mui/icons-material';
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

interface RepositoryFileExplorerProps {
  onFileSelect: (file: GitFile) => void;
}

const RepositoryFileExplorer: React.FC<RepositoryFileExplorerProps> = ({ onFileSelect }) => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const [files, setFiles] = useState<GitFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [repositoryId, currentPath]);

  const fetchFiles = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/repositories/${repositoryId}/files`, {
        params: { path }
      });
      
      setFiles(response.data);
    } catch (err) {
      console.error('Error fetching repository files:', err);
      setError('Failed to load repository files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: GitFile) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
    } else {
      onFileSelect(file);
    }
  };

  const navigateToBreadcrumb = (path: string) => {
    setCurrentPath(path);
  };

  const renderBreadcrumbs = () => {
    const paths = currentPath.split('/').filter(p => p);
    const breadcrumbs = [
      { name: 'Root', path: '' },
      ...paths.map((part, index) => ({
        name: part,
        path: paths.slice(0, index + 1).join('/')
      }))
    ];

    return (
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
        {breadcrumbs.map((breadcrumb, index) => (
          <Link
            key={index}
            underline="hover"
            color="inherit"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigateToBreadcrumb(breadcrumb.path)}
          >
            {breadcrumb.name}
          </Link>
        ))}
      </Breadcrumbs>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      {currentPath && (
        <Box mb={2}>
          {renderBreadcrumbs()}
        </Box>
      )}
      
      <List sx={{ bgcolor: 'background.paper' }}>
        {files.length === 0 ? (
          <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
            This directory is empty
          </Typography>
        ) : (
          files.map((file, index) => (
            <ListItem button key={index} onClick={() => handleFileClick(file)}>
              <ListItemIcon>
                {file.type === 'directory' ? <FolderIcon color="primary" /> : <FileIcon />}
              </ListItemIcon>
              <ListItemText 
                primary={file.name} 
                secondary={
                  <React.Fragment>
                    <Typography
                      sx={{ display: 'inline' }}
                      component="span"
                      variant="body2"
                      color="text.primary"
                    >
                      {file.last_commit.message}
                    </Typography>
                    {" — "}{formatDate(file.last_commit.date)}
                  </React.Fragment>
                }
              />
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
};

export default RepositoryFileExplorer;
