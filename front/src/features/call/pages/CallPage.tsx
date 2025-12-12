import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdaptiveWebRTC } from '../hooks/useAdaptiveWebRTC';
import VideoGrid from '../components/VideoGrid';
import ControlPanel from '../components/ControlPanel';
import PreCallSetup from '../components/PreCallSetup';
import ChatPanel from '../components/ChatPanel';
import RaisedHandsBadge from '../components/RaisedHandsBadge';
import socketService from '../services/socketService';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { checkCallAccess } from '../../../api/calls';

const CallPage: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const [hasJoined, setHasJoined] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<'ORGANIZER' | 'PARTICIPANT' | null>(null);
  const [preCallSettings, setPreCallSettings] = useState<{ 
    cameraEnabled: boolean; 
    microphoneEnabled: boolean; 
    guestName?: string 
  }>({ cameraEnabled: true, microphoneEnabled: true });
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsVisible, setIsParticipantsVisible] = useState(true);
  const [callContext, setCallContext] = useState<{ projectId?: string; taskId?: string }>({});
  const screenVideoRef = React.useRef<HTMLVideoElement>(null);
  
  const {
    localStream,
    localScreenStream,
    remoteVideoStreams,
    remoteAudioStreams,
    remoteScreenStreams,
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenSharing,
    participants,
    speakingParticipants,
    raisedHands,
    error,
    messages,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    toggleRaiseHand,
    initializeMedia,
    cleanup,
    sendMessage,
  } = useAdaptiveWebRTC(callId || '', preCallSettings.guestName);

  // Собираем все screen streams (локальный + удаленные), проверяя что они содержат треки
  const allScreenStreams = useMemo(() => {
    const streams: Array<{ stream: MediaStream; isLocal: boolean; socketId?: string }> = [];
    
    if (localScreenStream && localScreenStream.getVideoTracks().length > 0) {
      streams.push({ stream: localScreenStream, isLocal: true });
    }
    
    remoteScreenStreams.forEach((stream, socketId) => {
      // Проверяем что stream содержит активные видео треки
      if (stream && stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'live') {
          streams.push({ stream, isLocal: false, socketId });
        }
      }
    });
    
    return streams;
  }, [localScreenStream, remoteScreenStreams]);

  const hasScreenShare = allScreenStreams.length > 0;
  const currentScreen = useMemo(
    () => hasScreenShare ? allScreenStreams[currentScreenIndex] : null,
    [hasScreenShare, allScreenStreams, currentScreenIndex]
  );

  // Проверка доступа к звонку
  useEffect(() => {
    const checkAccess = async () => {
      if (!callId) return;
      
      try {
        console.log('🔍 Проверка доступа к звонку, roomId:', callId);
        const response = await checkCallAccess(callId);
        console.log('✅ Результат проверки доступа:', response);
        setHasAccess(response.hasAccess);
        setUserRole(response.role as 'ORGANIZER' | 'PARTICIPANT' | null);
        setAccessChecked(true);
        
        if (!response.hasAccess) {
          console.warn('❌ Доступ запрещен к звонку:', callId, 'Роль:', response.role);
          setTimeout(() => navigate('/calls'), 2000);
        } else {
          console.log('✅ Доступ разрешен, роль:', response.role);
        }
      } catch (error: any) {
        console.error('❌ Ошибка проверки доступа:', error);
        console.error('Детали ошибки:', error.response?.data || error.message);
        setAccessChecked(true);
        setHasAccess(false);
        setTimeout(() => navigate('/calls'), 2000);
      }
    };
    
    checkAccess();
  }, [callId, navigate]);

  // Загрузка информации о звонке для получения projectId/taskId
  useEffect(() => {
    const loadCallContext = async () => {
      if (callId) {
        try {
          const { getCallByRoomId } = await import('../../../api/calls');
          const callInfo = await getCallByRoomId(callId);
          setCallContext({
            projectId: callInfo.project_id,
            taskId: callInfo.task_id,
          });
        } catch (error) {
          console.warn('Не удалось загрузить контекст звонка:', error);
        }
      }
    };
    loadCallContext();
  }, [callId]);

  useEffect(() => {
    if (hasJoined) {
      initializeMedia();
    }
    return () => {
      if (hasJoined) {
        cleanup();
      }
    };
  }, [hasJoined, initializeMedia, cleanup]);

  // Сброс индекса если текущий screen исчез
  useEffect(() => {
    if (currentScreenIndex >= allScreenStreams.length && allScreenStreams.length > 0) {
      setCurrentScreenIndex(allScreenStreams.length - 1);
    }
  }, [allScreenStreams.length, currentScreenIndex]);

  // Обновление srcObject для screen video без ререндера
  useEffect(() => {
    if (screenVideoRef.current && currentScreen) {
      screenVideoRef.current.srcObject = currentScreen.stream;
    } else if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
  }, [currentScreen]);

  // Все хуки должны быть ДО условных return
  const handlePrevScreen = useCallback(() => {
    setCurrentScreenIndex((prev) => (prev > 0 ? prev - 1 : allScreenStreams.length - 1));
  }, [allScreenStreams.length]);

  const handleNextScreen = useCallback(() => {
    setCurrentScreenIndex((prev) => (prev < allScreenStreams.length - 1 ? prev + 1 : 0));
  }, [allScreenStreams.length]);

  // Получаем имя владельца screen share
  const screenOwnerName = useMemo(() => {
    if (!currentScreen) return '';
    if (currentScreen.isLocal) return 'Ваша демонстрация экрана';
    const participant = Array.from(participants.values()).find(p => p.socketId === currentScreen.socketId);
    return participant ? `${participant.username} - демонстрация экрана` : 'Демонстрация экрана';
  }, [currentScreen, participants]);

  const handleJoinCall = (options: { cameraEnabled: boolean; microphoneEnabled: boolean; guestName?: string }) => {
    setPreCallSettings(options);
    setHasJoined(true);
  };

  // Показать загрузку пока проверяется доступ
  if (!accessChecked) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  // Показать ошибку если нет доступа
  if (!hasAccess) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="bg-card border border-destructive rounded-lg p-6 max-w-md mx-4 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h2 className="text-xl font-bold text-destructive">Доступ запрещен</h2>
          </div>
          <p className="text-foreground mb-4">
            У вас нет доступа к этому звонку. Возможно, вы не были приглашены как участник.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Перенаправление на страницу звонков...
          </p>
          <Button onClick={() => navigate('/calls')}>
            Вернуться к списку звонков
          </Button>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="h-full overflow-auto">
        <PreCallSetup roomId={callId || ''} onJoin={handleJoinCall} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="bg-card border border-destructive rounded-lg p-6 max-w-md mx-4 shadow-lg">
          <h2 className="text-xl font-bold text-destructive mb-4">Ошибка подключения</h2>
          <p className="text-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Большой плеер для screen share */}
        {hasScreenShare && currentScreen && (
          <>
            <div 
              className="w-full bg-muted flex-shrink-0 relative transition-all duration-300" 
              style={{ height: isParticipantsVisible ? 'calc(100% - 200px - 56px)' : 'calc(100% - 56px)' }}
            >
              <video
                className="w-full h-full object-contain bg-muted"
                autoPlay
                playsInline
                ref={screenVideoRef}
              />
              
              {/* Информация о владельце */}
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-sm">
                <span className="text-foreground text-sm font-medium">{screenOwnerName}</span>
              </div>

              {/* Навигация между screen streams (если их несколько) */}
              {allScreenStreams.length > 1 && (
                <>
                  <button
                    onClick={handlePrevScreen}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background border border-border text-foreground p-3 rounded-full transition shadow-sm"
                    aria-label="Предыдущая демонстрация"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextScreen}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm hover:bg-background border border-border text-foreground p-3 rounded-full transition shadow-sm"
                    aria-label="Следующая демонстрация"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Индикатор количества */}
                  <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-border shadow-sm">
                    <span className="text-foreground text-sm">
                      {currentScreenIndex + 1} / {allScreenStreams.length}
                    </span>
                  </div>
                </>
              )}
            </div>

          </>
        )}

        {/* Полоса с камерами (режим зависит от наличия screen share) */}
        <div 
          className={`overflow-hidden transition-all duration-300 relative ${
            hasScreenShare && !isParticipantsVisible ? 'h-0' : hasScreenShare ? 'h-[200px]' : 'flex-1 pb-14'
          }`}
        >
          <VideoGrid
            localStream={localStream}
            remoteVideoStreams={remoteVideoStreams}
            remoteAudioStreams={remoteAudioStreams}
            isCameraEnabled={isCameraEnabled}
            isMicEnabled={isMicrophoneEnabled}
            participants={participants}
            speakingParticipants={speakingParticipants}
            raisedHands={raisedHands}
            isScreenSharing={hasScreenShare}
          />
        </div>
      </div>

      {/* Полоска-шторка для сворачивания списка участников (когда развернуто - поверх списка) */}
      {hasScreenShare && isParticipantsVisible && (
        <button
          onClick={() => setIsParticipantsVisible(false)}
          className="fixed bottom-[calc(56px+200px)] left-0 right-0 bg-card/30 hover:bg-card/95 hover:backdrop-blur-sm transition-all duration-200 flex items-center justify-center py-2 cursor-pointer group z-40"
          title="Скрыть участников"
        >
          <div className="flex items-center gap-2 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
            <ChevronDown className="w-4 h-4" />
            <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
          </div>
        </button>
      )}

      {/* Полоска-шторка для разворачивания списка участников (когда свернуто - над нижней панелью) */}
      {hasScreenShare && !isParticipantsVisible && (
        <button
          onClick={() => setIsParticipantsVisible(true)}
          className="fixed bottom-14 left-0 right-0 bg-card/30 hover:bg-card/95 hover:backdrop-blur-sm transition-all duration-200 flex items-center justify-center py-2 cursor-pointer group z-40"
          title="Показать участников"
        >
          <div className="flex items-center gap-2 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
            <ChevronUp className="w-4 h-4" />
            <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
          </div>
        </button>
      )}

      {/* Плашка с информацией о поднятых руках (только когда участники свернуты) */}
      {hasScreenShare && !isParticipantsVisible && (
        <RaisedHandsBadge participants={participants} raisedHands={raisedHands} />
      )}

      <ControlPanel
        isCameraEnabled={isCameraEnabled}
        isMicrophoneEnabled={isMicrophoneEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        isHandRaised={raisedHands.has('local')}
        onToggleCamera={toggleCamera}
        onToggleMicrophone={toggleMicrophone}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onToggleRaiseHand={toggleRaiseHand}
        roomId={callId || ''}
      />

      <ChatPanel
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        messages={messages}
        onSendMessage={sendMessage}
        onEditMessage={(messageId, newMessage) => {
          // TODO: Реализовать editMessage в useWebRTC и на бэкенде
          console.log('Редактирование сообщения:', messageId, newMessage);
          alert('Функция редактирования будет реализована на бэкенде');
        }}
        currentUserId={socketService.getSocket()?.id}
        projectId={callContext.projectId}
        taskId={callContext.taskId}
        roomId={callId || ''}
      />
    </div>
  );
};

export default CallPage;

