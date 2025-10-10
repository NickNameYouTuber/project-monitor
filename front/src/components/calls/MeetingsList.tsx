import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Video, Calendar, Clock, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';

interface MeetingsListProps {
  items: { 
    id: string; 
    title: string; 
    date: Date; 
    duration: number; 
    color?: string; 
    roomId?: string; 
    status?: string;
    description?: string;
    participants?: string[];
  }[];
  activeTab?: 'calendar' | 'list';
  onTabChange?: (tab: 'calendar' | 'list') => void;
  onJoinCall?: (roomId: string) => void;
  isLoading?: boolean;
}

export default function MeetingsList({ items, activeTab = 'list', onTabChange, onJoinCall, isLoading }: MeetingsListProps) {
  // Группировка по датам
  const groupedMeetings = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const groups: { label: string; meetings: typeof items }[] = [];

    // Сегодня
    const todayItems = items.filter(m => {
      const mDate = new Date(m.date.getFullYear(), m.date.getMonth(), m.date.getDate());
      return mDate.getTime() === today.getTime();
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (todayItems.length > 0) {
      groups.push({ label: `Сегодня • ${today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`, meetings: todayItems });
    }

    // Завтра
    const tomorrowItems = items.filter(m => {
      const mDate = new Date(m.date.getFullYear(), m.date.getMonth(), m.date.getDate());
      return mDate.getTime() === tomorrow.getTime();
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (tomorrowItems.length > 0) {
      groups.push({ label: `Завтра • ${tomorrow.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`, meetings: tomorrowItems });
    }

    // На этой неделе
    const thisWeekItems = items.filter(m => {
      const mDate = new Date(m.date.getFullYear(), m.date.getMonth(), m.date.getDate());
      return mDate > tomorrow && mDate <= weekEnd;
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (thisWeekItems.length > 0) {
      groups.push({ label: 'На этой неделе', meetings: thisWeekItems });
    }

    // Позже
    const laterItems = items.filter(m => {
      const mDate = new Date(m.date.getFullYear(), m.date.getMonth(), m.date.getDate());
      return mDate > weekEnd;
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (laterItems.length > 0) {
      groups.push({ label: 'Позже', meetings: laterItems });
    }

    // Прошедшие
    const pastItems = items.filter(m => {
      const mDate = new Date(m.date.getFullYear(), m.date.getMonth(), m.date.getDate());
      return mDate < today;
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
    
    if (pastItems.length > 0) {
      groups.push({ label: 'Прошедшие', meetings: pastItems });
    }

    return groups;
  }, [items]);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'border-green-500';
      case 'in-progress':
      case 'active':
        return 'border-blue-500 animate-pulse';
      case 'completed':
        return 'border-yellow-500';
      case 'cancelled':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Запланирован</span>;
      case 'in-progress':
      case 'active':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse">Идет сейчас</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Завершен</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Отменен</span>;
      default:
        return null;
    }
  };

  const handleCopyLink = (roomId: string) => {
    const link = `${window.location.origin}/call/${roomId}`;
    navigator.clipboard.writeText(link);
    // TODO: показать toast уведомление
    console.log('Ссылка скопирована:', link);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header с табами */}
      {onTabChange && (
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-none bg-transparent p-0">
              <button
                onClick={() => onTabChange('calendar')}
                className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all rounded-none border-b-2 ${
                  activeTab === 'calendar'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => onTabChange('list')}
                className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all rounded-none border-b-2 ${
                  activeTab === 'list'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список встреч с группировкой */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !items.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет запланированных звонков</h3>
            <p className="text-sm text-muted-foreground mb-4">Создайте первый звонок, чтобы начать</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMeetings.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Заголовок группы */}
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  📅 {group.label}
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {group.meetings.length}
                  </span>
                </h3>
                
                {/* Карточки в группе */}
                <div className="space-y-3">
                  {group.meetings.map((meeting) => {
                    const isJoinable = meeting.roomId && meeting.status !== 'completed' && meeting.status !== 'cancelled';
                    
                    return (
                      <Card key={meeting.id} className={`border-l-4 ${getStatusColor(meeting.status)} transition-all hover:shadow-md`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2 mb-2">
                                {meeting.title}
                              </CardTitle>
                              
                              {/* Дата и время */}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" />
                                  <span>{meeting.date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <span>•</span>
                                <span>{meeting.duration} мин</span>
                                {meeting.participants && meeting.participants.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>👤 {meeting.participants.length} участник{meeting.participants.length > 1 ? 'а' : ''}</span>
                                  </>
                                )}
                              </div>
                              
                              {/* Description preview */}
                              {meeting.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {meeting.description}
                                </p>
                              )}
                              
                              {/* Статус badge */}
                              <div className="mt-2">
                                {getStatusBadge(meeting.status)}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {isJoinable && onJoinCall && (
                                <Button
                                  size="sm"
                                  onClick={() => onJoinCall(meeting.roomId!)}
                                  className="flex items-center gap-2"
                                >
                                  <Video className="w-4 h-4" />
                                  Join
                                </Button>
                              )}
                              
                              {/* Quick Actions Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {meeting.roomId && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleCopyLink(meeting.roomId!)}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Скопировать ссылку
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem className="text-red-600 dark:text-red-400">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


