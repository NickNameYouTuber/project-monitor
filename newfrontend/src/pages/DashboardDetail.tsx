import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { reorderProjects, updateProjectStatus } from '../api/projects';
import { fetchDashboard, type Dashboard } from '../api/dashboards';
import { fetchProjectsByDashboard, type Project } from '../api/projects';

function DashboardDetail() {
  const { dashboardId } = useParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!dashboardId) return;
      setLoading(true);
      try {
        const [d, p] = await Promise.all([
          fetchDashboard(dashboardId),
          fetchProjectsByDashboard(dashboardId),
        ]);
        if (mounted) {
          setDashboard(d);
          setProjects(p);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [dashboardId]);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  if (!dashboard) {
    return <Text c="red">Дашборд не найден</Text>;
  }

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>{dashboard.name}</Title>
          {dashboard.description && (
            <Text c="dimmed" size="sm">{dashboard.description}</Text>
          )}
        </div>
        <Button component={Link} to="/dashboards" variant="light">Назад</Button>
      </Group>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Проекты</h2>
        {/* Здесь можно добавить кнопку создания проекта, если потребуется */}
      </div>
      <Card withBorder padding="md">
        <DragDropContext
          onDragEnd={async (result) => {
            const { source, destination, draggableId } = result;
            if (!destination) return;
            const sourceStatus = source.droppableId as Project['status'];
            const destStatus = destination.droppableId as Project['status'];

            const ordered = (status: Project['status']) => projects.filter(p => p.status === status).sort((a,b)=>a.order-b.order);

            if (sourceStatus === destStatus) {
              const list = ordered(sourceStatus);
              const sourceIndex = source.index;
              const destIndex = destination.index;
              const moved = list[sourceIndex];
              const target = list[destIndex];
              if (!moved || !target) return;
              setProjects((prev) => {
                const copy = [...prev];
                // swap orders to reflect reordering
                const movedIdx = copy.findIndex(p => p.id === moved.id);
                const targetIdx = copy.findIndex(p => p.id === target.id);
                const tmp = copy[movedIdx].order;
                copy[movedIdx] = { ...copy[movedIdx], order: copy[targetIdx].order } as Project;
                copy[targetIdx] = { ...copy[targetIdx], order: tmp } as Project;
                return copy;
              });
              try { await reorderProjects(moved.id, target.id, destIndex > sourceIndex ? 'below' : 'above'); } catch {}
            } else {
              // Change status and place approx at destination index
              setProjects((prev) => prev.map(p => p.id === draggableId ? { ...p, status: destStatus } as Project : p));
              try { await updateProjectStatus(draggableId, destStatus); } catch {}
            }
          }}
        >
          <div className="overflow-x-auto">
            <div className="min-w-[1000px] grid grid-cols-4 gap-4">
              {(['inPlans','inProgress','onPause','completed'] as const).map((status) => (
                <Droppable droppableId={status} key={status}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="bg-[var(--mantine-color-body)] rounded-md p-2 min-h-[300px]">
                      <Text fw={600} size="sm" className="mb-2">
                        {status === 'inPlans' ? 'В планах' : status === 'inProgress' ? 'В работе' : status === 'onPause' ? 'Пауза' : 'Завершён'}
                      </Text>
                      <Stack gap={8}>
                        {projects.filter((p) => p.status === status).sort((a,b)=>a.order-b.order).map((p, index) => (
                          <Draggable draggableId={p.id} index={index} key={p.id}>
                            {(drag) => (
                              <Card ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} withBorder shadow="xs" padding="sm" component={Link} to={`/projects/${p.id}/tasks`}>
                                <Text fw={600} size="sm">{p.name}</Text>
                                {p.description && <Text size="xs" c="dimmed" lineClamp={2}>{p.description}</Text>}
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </Stack>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </DragDropContext>
      </Card>
    </Stack>
  );
}

export default DashboardDetail;


