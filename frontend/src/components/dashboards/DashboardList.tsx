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
  Stack,
  Card,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconPlus, IconCalendar } from '@tabler/icons-react';

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
        <Title order={2} c="green">Your Dashboards</Title>
        <Button 
          onClick={open}
          leftSection={<IconPlus size={16} />}
          color="green"
          variant="filled"
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
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <Stack align="center" py="xl">
          <Loader size="lg" color="green" />
          <Text c="dimmed">Loading dashboards...</Text>
        </Stack>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {dashboards.length === 0 ? (
            <Paper p="xl" withBorder ta="center" w="100%" style={{ gridColumn: '1 / -1' }} radius="md" shadow="sm">
              <Text c="dimmed" size="lg" mb="md">You don't have any dashboards yet.</Text>
              <Text c="dimmed" size="sm">Create your first dashboard to get started!</Text>
            </Paper>
          ) : (
            dashboards.map((dashboard) => (
              <Card
                key={dashboard.id}
                withBorder
                shadow="sm"
                radius="md"
                p="lg"
                onClick={() => handleDashboardClick(dashboard.id)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                className="hover:shadow-lg"
              >
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Title order={4} c="green" lineClamp={2}>
                      {dashboard.name}
                    </Title>
                    <Badge color="green" variant="light" size="sm">
                      Active
                    </Badge>
                  </Group>
                  
                  {dashboard.description && (
                    <Text c="dimmed" size="sm" lineClamp={3}>
                      {dashboard.description}
                    </Text>
                  )}
                  
                  <Group gap="xs" mt="auto">
                    <IconCalendar size={14} />
                    <Text size="xs" c="dimmed">
                      Created: {new Date(dashboard.created_at).toLocaleDateString()}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            ))
          )}
        </SimpleGrid>
      )}
      
      {/* Create dashboard modal */}
      <Modal
        opened={opened}
        onClose={() => {
          close();
          setNewDashboardName('');
          setNewDashboardDescription('');
          setError(null);
        }}
        title={
          <Text fw={600} size="lg" c="green">
            Create New Dashboard
          </Text>
        }
        centered
        closeOnClickOutside={true}
        closeOnEscape={true}
        withCloseButton
        size="md"
        overlayProps={{ 
          backgroundOpacity: 0.55, 
          blur: 3,
          color: "#000"
        }}
        radius="md"
        transitionProps={{ transition: 'fade', duration: 200 }}
        portalProps={{ target: document.body }}
      >
        <Stack gap="md">
          <TextInput
            label="Dashboard Name"
            placeholder="Enter dashboard name"
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
            required
            data-autofocus
            radius="md"
            size="md"
          />
          <Textarea
            label="Description"
            placeholder="Enter dashboard description (optional)"
            value={newDashboardDescription}
            onChange={(e) => setNewDashboardDescription(e.target.value)}
            minRows={4}
            radius="md"
            size="md"
          />
          
          {error && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              title="Error" 
              color="red"
              variant="light"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button 
              variant="outline" 
              onClick={() => {
                close();
                setNewDashboardName('');
                setNewDashboardDescription('');
                setError(null);
              }}
              radius="md"
            >
              Cancel
            </Button>
            <Button 
              color="green" 
              onClick={handleCreateDashboard}
              disabled={!newDashboardName.trim()}
              radius="md"
              variant="filled"
            >
              Create Dashboard
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default DashboardList;
