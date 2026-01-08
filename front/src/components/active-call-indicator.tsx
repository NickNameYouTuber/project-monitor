// Компонент для отображения активных звонков в проекте/задаче
import React, { useEffect, useState } from 'react';
import { Video, Users, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';

interface ActiveCall {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  project_id?: string;
  task_id?: string;
  created_at?: string;
  participants?: number;
}

interface ActiveCallIndicatorProps {
  projectId?: string;
  taskId?: string;
  className?: string;
}

export function ActiveCallIndicator({ projectId, taskId, className = '' }: ActiveCallIndicatorProps) {
  const navigate = useNavigate();
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const fetchActiveCalls = async () => {
      try {
        const { listCalls } = await import('../api/calls');
        const calls = await listCalls();

        if (isCancelled) return;

        // Фильтруем звонки по проекту или задаче
        const filtered = calls.filter(call => {
          if (taskId && call.task_id === taskId) return true;
          if (projectId && call.project_id === projectId && !call.task_id) return true;
          return false;
        });

        // Проверяем, какие звонки активны (созданы в последние 4 часа)
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
        const active = filtered.filter(call => {
          const createdAt = new Date(call.created_at).getTime();
          return createdAt > fourHoursAgo;
        });

        const activeCallsData: ActiveCall[] = active.map(call => ({
          id: call.id,
          room_id: call.room_id,
          title: call.title,
          description: call.description,
          project_id: call.project_id,
          task_id: call.task_id,
          created_at: call.created_at,
          participants: Array.isArray(call.participants) ? call.participants.length : 0
        }));

        setActiveCalls(activeCallsData);
      } catch (error) {
        console.error('Ошибка загрузки активных звонков:', error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchActiveCalls();

    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchActiveCalls, 30000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [projectId, taskId]);

  if (loading || activeCalls.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {activeCalls.map(call => (
        <div
          key={call.id}
          className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
        >
          <div className="relative">
            <Video className="w-5 h-5 text-green-500" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {call.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Активный звонок
            </p>
          </div>

          {call.participants !== undefined && call.participants > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {call.participants}
            </Badge>
          )}

          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => navigate(`/call/${call.room_id}`)}
          >
            <Phone className="w-4 h-4 mr-1" />
            Join
          </Button>
        </div>
      ))}
    </div>
  );
}
