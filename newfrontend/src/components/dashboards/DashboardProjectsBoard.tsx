import { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Card, Group, Loader, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { fetchProjectsByDashboard, reorderProjects, updateProjectStatus, type Project } from '../../api/projects';

const STATUS_ORDER: Project['status'][] = ['inPlans', 'inProgress', 'onPause', 'completed'];
const STATUS_TITLE: Record<Project['status'], string> = {
  inPlans: 'В планах',
  inProgress: 'В работе',
  onPause: 'Пауза',
  completed: 'Завершён',
};

export default function DashboardProjectsBoard({ dashboardId }: { dashboardId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const columns = useMemo(() => {
    const byStatus: Record<Project['status'], Project[]> = {
      inPlans: [], inProgress: [], onPause: [], completed: []
    };
    for (const p of projects) {
      byStatus[p.status].push(p);
    }
    for (const key of STATUS_ORDER) byStatus[key].sort((a, b) => a.order - b.order);
    return byStatus;
  }, [projects]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProjectsByDashboard(dashboardId)
      .then((data) => { if (mounted) setProjects(data); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [dashboardId]);

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const sourceStatus = source.droppableId as Project['status'];
    const destStatus = destination.droppableId as Project['status'];
    if (sourceStatus === destStatus && source.index === destination.index) return;

    const destList = columns[destStatus];
    const targetProject = destList[destination.index] || destList[destList.length - 1];
    const position: 'above' | 'below' = destList[destination.index] ? 'above' : 'below';

    // Обновляем статус при переносе между колонками
    if (sourceStatus !== destStatus) {
      await updateProjectStatus(draggableId, destStatus);
    }

    if (targetProject && targetProject.id !== draggableId) {
      await reorderProjects(draggableId, targetProject.id, position);
    }

    // Оптимистично обновим локальное состояние
    setProjects((prev) => {
      const copy = [...prev];
      const moved = copy.find(p => p.id === draggableId);
      if (!moved) return prev;
      moved.status = destStatus;
      // пересчёт order по месту для корректного UI; сервер сохранит фактический порядок
      return copy.map(p => p.status === destStatus || p.status === sourceStatus ? p : p);
    });
  }

  if (loading) {
    return (
      <Group justify="center" mt="xl"><Loader /></Group>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Проекты</h2>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex overflow-x-auto pb-6 h-full w-full">
          {STATUS_ORDER.map((statusKey) => (
            <div key={statusKey} className="min-w-[300px] w-[320px] mr-4 flex-shrink-0">
              <Text fw={600} className="mb-2">{STATUS_TITLE[statusKey]}</Text>
              <Droppable droppableId={statusKey} type="project">
                {(dropProvided) => (
                  <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-2">
                    {columns[statusKey].map((p, index) => (
                      <Draggable key={p.id} draggableId={p.id} index={index}>
                        {(dragProvided) => (
                          <Card ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps} withBorder padding="md" shadow="xs" component={Link} to={`/projects/${p.id}/tasks`}>
                            <Text fw={600}>{p.name}</Text>
                            {p.description && <Text c="dimmed" size="sm" mt={6}>{p.description}</Text>}
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}


