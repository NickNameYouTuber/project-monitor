import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus,
} from 'lucide-react';
import { Button } from './ui/button';
import NewMeetingDialog from './calls/NewMeetingDialog';
import UpcomingOverlay from './calls/UpcomingOverlay';
import CallPage from '../features/call/pages/CallPage';
import MeetingsList from './calls/MeetingsList';
import MeetingFilters from './calls/MeetingFilters';
import UpcomingPanel from './calls/UpcomingPanel';
import SearchBar from './calls/SearchBar';
import MonthView from './calls/MonthView';
import WeekView from './calls/WeekView';
import CalendarContainer from './calls/CalendarContainer';
import CallDetailsPanel from './calls/CallDetailsPanel';
import { listCalls, createCall, getCallsInRange, CallResponse } from '../api/calls';
import { useNotifications } from '../hooks/useNotifications';

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number;
  participants: string[];
  type: 'video' | 'audio';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  description?: string;
  color?: string;
  roomId?: string;
}

// Predefined meeting colors with transparency
const MEETING_COLORS = [
  { name: 'Purple', value: 'rgba(99, 102, 241, 0.8)', bg: 'bg-indigo-500/80' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.8)', bg: 'bg-blue-500/80' },
  { name: 'Green', value: 'rgba(34, 197, 94, 0.8)', bg: 'bg-green-500/80' },
  { name: 'Orange', value: 'rgba(249, 115, 22, 0.8)', bg: 'bg-orange-500/80' },
  { name: 'Rose', value: 'rgba(244, 63, 94, 0.8)', bg: 'bg-rose-500/80' },
  { name: 'Violet', value: 'rgba(139, 92, 246, 0.8)', bg: 'bg-violet-500/80' },
  { name: 'Cyan', value: 'rgba(56, 189, 248, 0.8)', bg: 'bg-cyan-500/80' },
];

export function CallsPage() {
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active' | 'completed' | 'cancelled'>('all');
  const [isInCall, setIsInCall] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { showToast, addNotification } = useNotifications();
  
  // ЕДИНСТВЕННЫЙ ИСТОЧНИК ИСТИНЫ - calls из API
  const [calls, setCalls] = useState<CallResponse[]>([]);
  
  // Calendar state
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
  const [selectedCall, setSelectedCall] = useState<CallResponse | null>(null);
  const [isCallDetailsPanelOpen, setIsCallDetailsPanelOpen] = useState(false);

  // Преобразуем calls в meetings для UI
  const meetings = React.useMemo(() => {
    return calls.map(c => ({
      id: c.id,
      title: c.title || c.room_id,
      date: c.scheduled_time ? new Date(c.scheduled_time) : (c.start_at ? new Date(c.start_at) : new Date()),
      duration: c.duration_minutes || (c.end_at && c.start_at ? Math.max(1, Math.round((new Date(c.end_at).getTime() - new Date(c.start_at).getTime()) / 60000)) : 30),
      participants: [],
      type: 'video' as const,
      status: (c.status?.toLowerCase() || 'scheduled') as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
      color: MEETING_COLORS[Math.floor(Math.random() * MEETING_COLORS.length)].value,
      roomId: c.room_id,
      description: c.description,
    }));
  }, [calls]);

  // Загрузка всех звонков из API
  const loadCallsFromAPI = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const callsData = await listCalls();
      console.log('✅ Загружено звонков из API:', callsData.length);
      setCalls(callsData);
    } catch (err: any) {
      console.error('❌ Ошибка загрузки звонков:', err);
      setError('Не удалось загрузить звонки. Попробуйте обновить страницу.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Начальная загрузка + автообновление каждую минуту
  useEffect(() => {
    loadCallsFromAPI();
    
    const intervalId = setInterval(() => {
      console.log('🔄 Автообновление статусов звонков');
      loadCallsFromAPI();
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [loadCallsFromAPI]);

  useEffect(() => {
    if (roomId) {
      setIsInCall(true);
    }
  }, [roomId]);

  // Перезагрузка всех звонков (обновляет единый источник истины)
  const reloadCalls = React.useCallback(async () => {
    await loadCallsFromAPI();
  }, [loadCallsFromAPI]);

  // Фильтр звонков для календаря (по текущей дате)
  const calendarCalls = React.useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (calendarView === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    } else {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    }
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return calls.filter(c => {
      const timeStr = c.scheduled_time || c.start_at;
      if (!timeStr) return false;
      
      const callDate = new Date(timeStr);
      return callDate >= start && callDate <= end;
    });
  }, [calls, currentDate, calendarView]);
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);

  const [newMeeting, setNewMeeting] = useState<{
    title: string;
    date: Date;
    time: string;
    duration: number;
    type: 'video' | 'audio';
    description: string;
    participants: any[];
    color: string;
    isRecurring?: boolean;
    recurrenceType?: string;
    recurrenceDays?: number[];
    recurrenceEndDate?: Date | null;
  }>({
    title: '',
    date: new Date(),
    time: '09:00',
    duration: 30,
    type: 'video',
    description: '',
    participants: [],
    color: MEETING_COLORS[0].value,
    isRecurring: false,
    recurrenceType: 'NONE',
    recurrenceDays: [],
    recurrenceEndDate: null
  });

  // Фильтрация по поиску и статусу
  const filteredMeetings = React.useMemo(() => {
    let filtered = meetings;
    
    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status?.toLowerCase() === statusFilter);
    }
    
    // Фильтр по поиску
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.participants.some(p => p.toLowerCase().includes(query)) ||
        m.roomId?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [meetings, searchQuery, statusFilter]);

  const upcomingMeetings = filteredMeetings
    .filter(meeting => meeting.date > new Date() && meeting.status === 'scheduled')
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const handleCreateMeeting = async () => {
    const [hours, minutes] = newMeeting.time.split(':').map(Number);
    const meetingDate = new Date(newMeeting.date);
    meetingDate.setHours(hours, minutes);

    const roomId = Date.now().toString();

    try {
      const payload: any = {
        room_id: roomId,
        title: newMeeting.title,
        description: newMeeting.description,
        start_at: meetingDate.toISOString(),
        end_at: new Date(meetingDate.getTime() + newMeeting.duration * 60000).toISOString(),
        scheduled_time: meetingDate.toISOString(),
        duration_minutes: newMeeting.duration,
        status: 'SCHEDULED',
        participant_ids: newMeeting.participants?.map((u: any) => u.id) || [],
      };
      
      if (newMeeting.isRecurring) {
        payload.is_recurring = true;
        payload.recurrence_type = newMeeting.recurrenceType;
        payload.recurrence_days = newMeeting.recurrenceDays;
        if (newMeeting.recurrenceEndDate) {
          payload.recurrence_end_date = new Date(newMeeting.recurrenceEndDate).toISOString();
        }
      }
      
      await createCall(payload);
      
      console.log('✅ Звонок создан успешно');
      
      const participantCount = newMeeting.participants?.length || 0;
      const message = newMeeting.isRecurring 
        ? `Создана серия повторяющихся встреч` 
        : participantCount > 0 
          ? `${participantCount} участник${participantCount > 1 ? 'а' : ''} получ${participantCount > 1 ? 'ат' : 'ит'} уведомление`
          : 'Вы можете пригласить участников позже';
      
      showToast('Звонок создан', message, 'success');
      
      await reloadCalls();
      
      setNewMeeting({
        title: '',
        date: new Date(),
        time: '09:00',
        duration: 30,
        type: 'video',
        description: '',
        participants: [],
        color: MEETING_COLORS[0].value,
        isRecurring: false,
        recurrenceType: 'NONE',
        recurrenceDays: [],
        recurrenceEndDate: null
      });
      setIsCreateMeetingOpen(false);
    } catch (err: any) {
      console.error('❌ Ошибка создания звонка:', err);
      setError('Не удалось создать звонок. Попробуйте еще раз.');
      showToast('Ошибка', 'Не удалось создать звонок. Попробуйте еще раз.', 'error');
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    try {
      // TODO: API endpoint для отмены звонка
      // await cancelCall(meetingId);
      console.log('Отмена звонка:', meetingId);
      
      // Перезагружаем звонки
      await reloadCalls();
    } catch (err) {
      console.error('Ошибка отмены звонка:', err);
      setError('Не удалось отменить звонок.');
    }
  }; 

  const startCall = (meeting?: Meeting) => {
    if (meeting) {
      navigate(`/call/${meeting.roomId || meeting.id}`);
    } else {
      const rid = Date.now().toString();
      navigate(`/call/${rid}`);
    }
  };

  const endCall = () => {
    setIsInCall(false);
    navigate('/calls');
  };

  if (isInCall) {
    return (
      <div className="h-full w-full">
        <CallPage />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header - фиксированная высота */}
      <div className="flex-none border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Calls & Meetings</h1>
            <p className="text-muted-foreground">Schedule and manage your team meetings</p>
          </div>
          <Button onClick={() => setIsCreateMeetingOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Meeting
          </Button>
          <NewMeetingDialog open={isCreateMeetingOpen} setOpen={setIsCreateMeetingOpen} newMeeting={newMeeting} setNewMeeting={setNewMeeting} colors={MEETING_COLORS} onCreate={handleCreateMeeting} />
        </div>
        
        <SearchBar value={searchQuery} onChange={setSearchQuery} onToggleUpcoming={() => setIsUpcomingOpen(!isUpcomingOpen)} upcomingCount={upcomingMeetings.length} />
        
        {/* Error banner */}
        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Content area - растягивается на оставшееся пространство */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        
        {/* Фильтры (только для List view) */}
        {activeTab === 'list' && (
          <MeetingFilters 
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}
        
        {/* Табы Calendar/List */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border">
          <div className="flex items-center rounded-none bg-transparent p-0">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all rounded-none border-b-2 ${
                activeTab === 'calendar'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('list')}
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
        
        {/* Tabs content - растягивается на оставшееся пространство */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'calendar' ? (
            <CalendarContainer>
              {calendarView === 'month' ? (
                <MonthView 
                  currentDate={currentDate}
                  calls={calendarCalls}
                  onDateChange={setCurrentDate}
                  onDayClick={(date) => {
                    setCurrentDate(date);
                    setCalendarView('week');
                  }}
                  onCallClick={(call) => {
                    setSelectedCall(call);
                    setIsCallDetailsPanelOpen(true);
                  }}
                  calendarView={calendarView}
                  onCalendarViewChange={setCalendarView}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              ) : (
                <WeekView 
                  currentDate={currentDate}
                  calls={calendarCalls}
                  onDateChange={setCurrentDate}
                  onCallClick={(call) => {
                    setSelectedCall(call);
                    setIsCallDetailsPanelOpen(true);
                  }}
                  calendarView={calendarView}
                  onCalendarViewChange={setCalendarView}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              )}
            </CalendarContainer>
          ) : (
            <MeetingsList 
              items={filteredMeetings} 
              onJoinCall={(roomId) => navigate(`/call/${roomId}`)}
              isLoading={isLoading}
              onCopyLink={(roomId) => showToast('Ссылка скопирована', undefined, 'success')}
            />
          )}
        </div>

        {/* Sliding Upcoming Meetings Panel */}
        <UpcomingPanel open={isUpcomingOpen} onClose={() => setIsUpcomingOpen(false)} items={upcomingMeetings} onStart={(id) => {
          const m = meetings.find(mm => mm.id === id);
          startCall(m);
        }} />
        
        {/* Overlay when panel is open */}
        <UpcomingOverlay open={isUpcomingOpen} onClick={() => setIsUpcomingOpen(false)} />

        {/* Call Details Panel */}
        <CallDetailsPanel
          call={selectedCall}
          open={isCallDetailsPanelOpen}
          onClose={() => {
            setIsCallDetailsPanelOpen(false);
            setSelectedCall(null);
          }}
          onJoinCall={(roomId) => navigate(`/call/${roomId}`)}
        />
      </div>
    </div>
  );
}