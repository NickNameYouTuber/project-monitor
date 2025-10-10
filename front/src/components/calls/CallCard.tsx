import React, { useRef } from 'react';
import { CallResponse } from '../../api/calls';
import { Users, Target, Play } from 'lucide-react';

interface CallCardProps {
  call: CallResponse;
  onClick: () => void;
  compact?: boolean;
}

const animatedCallsRef = new Set<string>();

const CallCard: React.FC<CallCardProps> = ({ call, onClick, compact = false }) => {
  // Вычисляем актуальный статус на основе времени
  const getActualStatus = (): string => {
    const now = new Date();
    const apiStatus = call.status?.toUpperCase();
    
    // Если API говорит COMPLETED/CANCELLED - верим ему
    if (apiStatus === 'COMPLETED' || apiStatus === 'CANCELLED') {
      return apiStatus;
    }
    
    const timeStr = call.scheduled_time || call.start_at;
    if (!timeStr) return apiStatus || 'SCHEDULED';
    
    const startTime = new Date(timeStr);
    const endTime = new Date(startTime.getTime() + (call.duration_minutes || 30) * 60000);
    
    // Если API говорит ACTIVE, проверяем что время корректное
    if (apiStatus === 'ACTIVE') {
      if (startTime <= now && now < endTime) {
        return 'ACTIVE';
      }
      if (now >= endTime) {
        return 'COMPLETED';
      }
      return 'SCHEDULED';
    }
    
    // Если SCHEDULED, проверяем время
    if (apiStatus === 'SCHEDULED') {
      if (startTime <= now && now < endTime) {
        return 'ACTIVE';
      }
      if (now >= endTime) {
        return 'COMPLETED';
      }
    }
    
    return apiStatus || 'SCHEDULED';
  };

  const actualStatus = getActualStatus();
  
  const shouldAnimate = actualStatus === 'ACTIVE' && !animatedCallsRef.has(call.id);
  if (shouldAnimate) {
    animatedCallsRef.add(call.id);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'ACTIVE':
        return `border-blue-500 bg-blue-50 dark:bg-blue-950/20 ${shouldAnimate ? 'animate-pulse-limited' : ''}`;
      case 'COMPLETED':
        return 'border-gray-400 bg-gray-50 dark:bg-gray-950/20';
      case 'CANCELLED':
        return 'border-red-500 bg-red-50 dark:bg-red-950/20';
      default:
        return 'border-border bg-card';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'ACTIVE') {
      return <div className={`w-2 h-2 rounded-full bg-blue-500 ${shouldAnimate ? 'animate-pulse-limited' : ''}`} />;
    }
    return null;
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins > 0 ? `${mins}м` : ''}`;
  };

  const getTimeRange = () => {
    if (!call.scheduled_time) return '';
    const start = formatTime(call.scheduled_time);
    if (!call.duration_minutes) return start;
    
    const startDate = new Date(call.scheduled_time);
    const endDate = new Date(startDate.getTime() + call.duration_minutes * 60000);
    const end = formatTime(endDate.toISOString());
    
    return `${start} - ${end}`;
  };

  if (compact) {
    // Для компактного режима показываем только время начала и длительность
    const startTime = formatTime(call.scheduled_time || call.start_at);
    const duration = formatDuration(call.duration_minutes);
    
    return (
      <div
        onClick={onClick}
        className={`
          h-full w-full rounded border-l-4 p-1 cursor-pointer
          transition hover:shadow-md overflow-hidden flex flex-col
          ${getStatusColor(actualStatus)}
        `}
      >
        <div className="flex items-center gap-1 mb-0.5">
          {getStatusIcon(actualStatus)}
          <div className="font-medium text-[10px] truncate flex-1 leading-tight">{call.title || 'Без названия'}</div>
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight">
          {startTime}
          {duration && <span className="ml-1">({duration})</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border-2 p-3 cursor-pointer
        transition hover:shadow-md
        ${getStatusColor(actualStatus)}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon(actualStatus)}
          <h3 className="font-medium text-sm">{call.title || 'Без названия'}</h3>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div>{getTimeRange()}</div>
        {call.duration_minutes && (
          <div className="flex items-center gap-1">
            <span>⏱</span>
            <span>{formatDuration(call.duration_minutes)}</span>
          </div>
        )}
        {call.task_id && (
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>Задача</span>
          </div>
        )}
      </div>

      {actualStatus === 'ACTIVE' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/call/${call.room_id}`, '_blank');
          }}
          className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition"
        >
          <Play className="w-3 h-3" />
          Присоединиться
        </button>
      )}
    </div>
  );
};

export default CallCard;

