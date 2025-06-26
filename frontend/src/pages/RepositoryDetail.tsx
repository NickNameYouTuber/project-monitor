import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab,
  Grid,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Code as CodeIcon,
  History as HistoryIcon,
  Group as GroupIcon,
  Link as LinkIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import PageHeader from '../components/common/PageHeader';
import RepositoryFileExplorer from '../components/repositories/RepositoryFileExplorer';
import FileViewer from '../components/repositories/FileViewer';
import CommitHistory from '../components/repositories/CommitHistory';
import api from '../services/api';

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

interface Repository {
  id: string;
  name: string;
  description: string | null;
  url: string;
  visibility: 'public' | 'private';
  owner: {
    id: string;
    username: string;
    first_name: string;
    last_name: string | null;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
}

const RepositoryDetail: React.FC = () => {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<GitFile | null>(null);

  useEffect(() => {
    fetchRepository();
  }, [repositoryId]);

  const fetchRepository = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/repositories/${repositoryId}`);
      setRepository(response.data);
    } catch (err) {
      console.error('Error fetching repository details:', err);
      setError('Failed to load repository details.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Reset selected file when switching away from code tab
    if (newValue !== 0) {
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (file: GitFile) => {
    setSelectedFile(file);
  };

  const renderTabContent = () => {
    switch (tabValue) {
      case 0: // Code
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5} lg={4}>
              <RepositoryFileExplorer onFileSelect={handleFileSelect} />
            </Grid>
            <Grid item xs={12} md={7} lg={8}>
              {repositoryId && <FileViewer repositoryId={repositoryId} file={selectedFile} />}
            </Grid>
          </Grid>
        );
      case 1: // Commits
        return repositoryId ? <CommitHistory repositoryId={repositoryId} /> : null;
      case 2: // Members
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Участники репозитория
            </Typography>
            <Typography>
              Страница участников репозитория будет реализована в следующем этапе.
            </Typography>
          </Paper>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !repository) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Repository not found'}
        </Alert>
        <Box mt={2}>
          <Button variant="outlined" onClick={() => navigate('/repositories')}>
            Back to Repositories
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <PageHeader
        title={repository.name}
        subtitle={repository.description}
        backButton={{
          text: "Все репозитории",
          link: "/repositories"
        }}
        actionButton={{
          text: "Clone",
          link: "#",
          variant: "primary"
        }}
      />
      
      <Box sx={{ mb: 3 }}>
        {repository.description && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            {repository.description}
          </Typography>
        )}
        
        <Box display="flex" alignItems="center">
          <Chip
            icon={repository.visibility === 'public' ? <VisibilityIcon /> : <VisibilityOffIcon />}
            label={repository.visibility === 'public' ? 'Public' : 'Private'}
            size="small"
            color={repository.visibility === 'public' ? 'success' : 'default'}
            sx={{ mr: 2 }}
          />
          
          <Typography variant="body2" color="text.secondary">
            Создан: {new Date(repository.created_at).toLocaleDateString()}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            Владелец: {repository.owner.first_name} {repository.owner.last_name || ''}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="repository tabs"
        >
          <Tab icon={<CodeIcon />} iconPosition="start" label="Код" />
          <Tab icon={<HistoryIcon />} iconPosition="start" label="История коммитов" />
          <Tab icon={<GroupIcon />} iconPosition="start" label="Участники" />
        </Tabs>
      </Box>
      
      <Box sx={{ py: 2 }}>
        {renderTabContent()}
      </Box>
    </Container>
  );
};

export default RepositoryDetail;
