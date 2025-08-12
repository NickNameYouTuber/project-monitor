import { useEffect, useState } from 'react';
import { Button, Card, Grid, Group, Loader, Modal, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link } from 'react-router-dom';
import { createDashboard, fetchDashboards, type Dashboard } from '../api/dashboards';

function Dashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchDashboards()
      .then((data) => {
        if (mounted) setDashboards(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Дашборды</h2>
        <Button size="xs" onClick={open}>Новый дашборд</Button>
      </div>
      <Grid>
        {dashboards.map((d) => (
          <Grid.Col key={d.id} span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder shadow="sm" padding="lg" component={Link} to={`/dashboards/${d.id}`}>
              <Text fw={600}>{d.name}</Text>
              {d.description && (
                <Text c="dimmed" size="sm" mt={6}>
                  {d.description}
                </Text>
              )}
            </Card>
          </Grid.Col>
        ))}
      </Grid>
      {dashboards.length === 0 && (
        <Text c="dimmed">Нет доступных дашбордов</Text>
      )}

      <Modal opened={opened} onClose={close} title="Создать дашборд" centered>
        <Stack>
          <TextInput
            label="Название"
            placeholder="Введи название"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            required
            data-autofocus
          />
          <Textarea
            label="Описание"
            placeholder="Опционально"
            value={newDescription}
            onChange={(e) => setNewDescription(e.currentTarget.value)}
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Отмена</Button>
            <Button
              loading={creating}
              disabled={!newName.trim()}
              onClick={async () => {
                setCreating(true);
                try {
                  const created = await createDashboard({ name: newName.trim(), description: newDescription.trim() || undefined });
                  setDashboards((prev) => [created, ...prev]);
                  setNewName('');
                  setNewDescription('');
                  close();
                } finally {
                  setCreating(false);
                }
              }}
            >
              Создать
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export default Dashboards;

