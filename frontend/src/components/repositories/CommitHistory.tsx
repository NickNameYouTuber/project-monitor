import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import { 
  History as HistoryIcon,
  ArrowRight as ArrowRightIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  CreateOutlined as CreateIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../services/api';

interface GitAuthor {
  name: string;
  email: string;
}

interface GitCommitStats {
  files_changed: number;
  insertions: number;
  deletions: number;
}

interface GitCommit {
  hash: string;
  author: GitAuthor;
  message: string;
  date: string;
  stats: GitCommitStats;
}

interface GitFileChange {
  path: string;
  old_path: string | null;
  change_type: string;
  additions: number;
  deletions: number;
  diff: string;
}

interface GitCommitDetail {
  hash: string;
  author: GitAuthor;
  committer: GitAuthor;
  message: string;
  date: string;
  parent_hashes: string[];
  files: GitFileChange[];
}

interface CommitHistoryProps {
  repositoryId: string;
  path?: string;
}

const CommitHistory: React.FC<CommitHistoryProps> = ({ repositoryId, path }) => {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<GitCommitDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    fetchCommits();
  }, [repositoryId, path, page]);

  const fetchCommits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/repositories/${repositoryId}/commits`, {
        params: { 
          path,
          limit: 20,
          skip: page * 20
        }
      });
      
      setCommits(response.data);
    } catch (err) {
      console.error('Error fetching commits:', err);
      setError('Failed to load commit history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommitDetail = async (commitHash: string) => {
    try {
      setDetailLoading(true);
      
      const response = await api.get(`/repositories/${repositoryId}/commits/${commitHash}`);
      setSelectedCommit(response.data);
      setDialogOpen(true);
    } catch (err) {
      console.error('Error fetching commit details:', err);
      setError('Failed to load commit details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCommitClick = (commit: GitCommit) => {
    fetchCommitDetail(commit.hash);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCommit(null);
  };

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'd MMMM yyyy, HH:mm', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  const formatDiffLines = (diff: string): JSX.Element[] => {
    if (!diff) return [<span key="empty">No changes</span>];
    
    return diff.split('\n').map((line, index) => {
      let className = '';
      let icon = null;
      
      if (line.startsWith('+')) {
        className = 'addition';
        icon = <AddIcon fontSize="small" style={{ color: '#4caf50' }} />;
      } else if (line.startsWith('-')) {
        className = 'deletion';
        icon = <RemoveIcon fontSize="small" style={{ color: '#f44336' }} />;
      }
      
      return (
        <Box key={index} display="flex" alignItems="center" sx={{
          bgcolor: className === 'addition' ? 'rgba(76, 175, 80, 0.1)' : 
                  className === 'deletion' ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
          py: 0.25,
          px: 1,
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          whiteSpace: 'pre-wrap',
          overflowX: 'auto',
          width: '100%'
        }}>
          {icon && <Box mr={1} minWidth="24px">{icon}</Box>}
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{line}</Typography>
        </Box>
      );
    });
  };

  const renderCommitDialog = () => {
    if (!selectedCommit) return null;
    
    return (
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            {selectedCommit.message}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {selectedCommit.hash.substring(0, 8)}
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box mb={3}>
            <Typography variant="subtitle2">
              Автор: {selectedCommit.author.name} <Typography component="span" color="text.secondary">({selectedCommit.author.email})</Typography>
            </Typography>
            <Typography variant="subtitle2">
              Дата: {formatDateTime(selectedCommit.date)}
            </Typography>
          </Box>
          
          <Typography variant="h6" gutterBottom>
            Изменения ({selectedCommit.files.length} файл(ов))
          </Typography>
          
          {selectedCommit.files.map((file, index) => (
            <Box key={index} mb={4}>
              <Box display="flex" alignItems="center" mb={1}>
                <Chip 
                  label={file.change_type} 
                  size="small" 
                  color={
                    file.change_type === 'added' ? 'success' :
                    file.change_type === 'deleted' ? 'error' :
                    file.change_type === 'renamed' ? 'info' :
                    'default'
                  } 
                  sx={{ mr: 1 }} 
                />
                <Typography variant="subtitle2">
                  {file.path}
                </Typography>
                {file.old_path && (
                  <>
                    <ArrowRightIcon sx={{ mx: 1 }} />
                    <Typography variant="subtitle2">
                      {file.path}
                    </Typography>
                  </>
                )}
              </Box>
              
              <Paper variant="outlined" sx={{ p: 1, maxHeight: '300px', overflow: 'auto' }}>
                {formatDiffLines(file.diff)}
              </Paper>
            </Box>
          ))}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (loading && commits.length === 0) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        История коммитов {path ? `(${path})` : ''}
      </Typography>
      
      {error && <Alert severity="error">{error}</Alert>}
      
      <List sx={{ bgcolor: 'background.paper' }}>
        {commits.map((commit, index) => (
          <React.Fragment key={commit.hash}>
            <ListItem button onClick={() => handleCommitClick(commit)} alignItems="flex-start">
              <ListItemIcon>
                <CreateIcon />
              </ListItemIcon>
              <ListItemText
                primary={commit.message}
                secondary={
                  <React.Fragment>
                    <Typography
                      sx={{ display: 'inline' }}
                      component="span"
                      variant="body2"
                      color="text.primary"
                    >
                      {commit.author.name}
                    </Typography>
                    {" — "}{formatDateTime(commit.date)}
                    <Box mt={1} display="flex">
                      <Chip 
                        label={`${commit.stats.files_changed} файл(ов)`}
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      {commit.stats.insertions > 0 && (
                        <Chip 
                          icon={<AddIcon />} 
                          label={`+${commit.stats.insertions}`}
                          size="small" 
                          color="success"
                          sx={{ mr: 1 }}
                        />
                      )}
                      {commit.stats.deletions > 0 && (
                        <Chip 
                          icon={<RemoveIcon />} 
                          label={`-${commit.stats.deletions}`}
                          size="small" 
                          color="error"
                        />
                      )}
                    </Box>
                  </React.Fragment>
                }
              />
            </ListItem>
            {index < commits.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
      
      {commits.length === 20 && (
        <Box mt={2} display="flex" justifyContent="center">
          <Button 
            variant="outlined" 
            onClick={() => setPage(page + 1)} 
            startIcon={<HistoryIcon />}
          >
            Загрузить более ранние коммиты
          </Button>
        </Box>
      )}
      
      {page > 0 && (
        <Box mt={2} display="flex" justifyContent="center">
          <Button 
            variant="text" 
            onClick={() => setPage(Math.max(0, page - 1))} 
          >
            Вернуться к новым коммитам
          </Button>
        </Box>
      )}
      
      {renderCommitDialog()}
    </Paper>
  );
};

export default CommitHistory;
