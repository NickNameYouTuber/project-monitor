import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { Dashboard } from '../../types';
import { 
  Title, 
  Button, 
  Container, 
  SimpleGrid, 
  Paper, 
  Text, 
  Loader, 
  Alert, 
  Modal, 
  TextInput,
  Textarea, 
  Group,
  Stack
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';

const DashboardList: React.FC = () => {
  const { currentUser } = useAppContext();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch dashboards
    const fetchDashboards = async () => {
      if (!currentUser?.token) return;
      
      try {
        setIsLoading(true);
        const data = await api.dashboards.getAll(currentUser.token);
        setDashboards(data as Dashboard[]);
        setError(null);
      } catch (error) {
        console.error('Failed to load dashboards:', error);
        setError('Failed to load dashboards.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboards();
  }, [currentUser]);

  const handleCreateDashboard = async () => {
    if (!currentUser?.token || !newDashboardName.trim()) return;
    
    try {
      const newDashboard = await api.dashboards.create({
        name: newDashboardName.trim(),
        description: newDashboardDescription.trim()
      }, currentUser.token);
      
      setDashboards([...dashboards, newDashboard as Dashboard]);
      close();
      setNewDashboardName('');
      setNewDashboardDescription('');
    } catch (err) {
      console.error('Failed to create dashboard:', err);
      setError('Failed to create dashboard. Please try again.');
    }
  };

  const handleDashboardClick = (dashboardId: string) => {
    navigate(`/dashboards/${dashboardId}`);
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Your Dashboards</Title>
        <Button 
          onClick={open}
          leftSection={<IconPlus size={16} />}
          color="green"
        >
          Create Dashboard
        </Button>
      </Group>
      
      {/* Error message */}
      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Error" 
          color="red"
          mb="lg"
          variant="light"
        >
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <Stack align="center" py="xl">
          <Loader size="lg" color="green" />
        </Stack>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {dashboards.length === 0 ? (
            <Paper p="xl" withBorder ta="center" w="100%" style={{ gridColumn: '1 / -1' }}>
              <Text c="dimmed">You don't have any dashboards yet. Create one to get started!</Text>
            </Paper>
          ) : (
            dashboards.map((dashboard) => (
              <Paper
                key={dashboard.id}
                withBorder
                p="lg"
                radius="md"
                onClick={() => handleDashboardClick(dashboard.id)}
                style={{ cursor: 'pointer' }}
                shadow="sm"
                ta="left"
                className="hover:shadow-md transition-shadow duration-200"
              >
                <Title order={4} mb="xs">{dashboard.name}</Title>
                {dashboard.description && (
                  <Text c="dimmed" size="sm" mb="md">{dashboard.description}</Text>
                )}
                <Text size="xs" c="dimmed">
                  Created: {new Date(dashboard.created_at).toLocaleDateString()}
                </Text>
              </Paper>
            ))
          )}
        </SimpleGrid>
      )}
      
      {/* Create dashboard modal */}
      <Modal
        opened={opened}
        onClose={close}
        title="Create New Dashboard"
        centered
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        <Stack>
          <TextInput
            label="Dashboard Name"
            placeholder="Enter dashboard name"
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
            required
            data-autofocus
          />
          <Textarea
            label="Description"
            placeholder="Enter dashboard description (optional)"
            value={newDashboardDescription}
            onChange={(e) => setNewDashboardDescription(e.target.value)}
            minRows={4}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button 
              color="green" 
              onClick={handleCreateDashboard}
              disabled={!newDashboardName.trim()}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default DashboardList;
