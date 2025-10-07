import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoGrid from '../components/VideoGrid';
import ControlPanel from '../components/ControlPanel';
import PreCallSetup from '../components/PreCallSetup';
import ChatPanel from '../components/ChatPanel';
import socketService from '../services/socketService';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const CallPage: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const [hasJoined, setHasJoined] = useState(false);
  const [preCallSettings, setPreCallSettings] = useState<{ 
    cameraEnabled: boolean; 
    microphoneEnabled: boolean; 
    guestName?: string 
  }>({ cameraEnabled: true, microphoneEnabled: true });
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsVisible, setIsParticipantsVisible] = useState(true);
  
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
    error,
    messages,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    initializeMedia,
    cleanup,
    sendMessage,
  } = useWebRTC(callId || '', preCallSettings.guestName);

  // Собираем все screen streams (локальный + удаленные), проверяя что они содержат треки
  const allScreenStreams: Array<{ stream: MediaStream; isLocal: boolean; socketId?: string }> = [];
  
  if (localScreenStream && localScreenStream.getVideoTracks().length > 0) {
    allScreenStreams.push({ stream: localScreenStream, isLocal: true });
  }
  
  remoteScreenStreams.forEach((stream, socketId) => {
    // Проверяем что stream содержит активные видео треки
    if (stream && stream.getVideoTracks().length > 0) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === 'live') {
        allScreenStreams.push({ stream, isLocal: false, socketId });
      }
    }
  });

  const hasScreenShare = allScreenStreams.length > 0;
  const currentScreen = hasScreenShare ? allScreenStreams[currentScreenIndex] : null;

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

  const handleJoinCall = (options: { cameraEnabled: boolean; microphoneEnabled: boolean; guestName?: string }) => {
    setPreCallSettings(options);
    setHasJoined(true);
  };

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

  const handlePrevScreen = () => {
    setCurrentScreenIndex((prev) => (prev > 0 ? prev - 1 : allScreenStreams.length - 1));
  };

  const handleNextScreen = () => {
    setCurrentScreenIndex((prev) => (prev < allScreenStreams.length - 1 ? prev + 1 : 0));
  };

  // Получаем имя владельца screen share
  const getScreenOwnerName = () => {
    if (!currentScreen) return '';
    if (currentScreen.isLocal) return 'Ваша демонстрация экрана';
    const participant = Array.from(participants.values()).find(p => p.socketId === currentScreen.socketId);
    return participant ? `${participant.username} - демонстрация экрана` : 'Демонстрация экрана';
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Большой плеер для screen share */}
        {hasScreenShare && currentScreen && (
          <div 
            className="w-full bg-muted flex-shrink-0 border-b border-border relative transition-all duration-300" 
            style={{ height: isParticipantsVisible ? '60vh' : '85vh' }}
          >
            <video
              className="w-full h-full object-contain bg-muted"
              autoPlay
              playsInline
              ref={(el) => { if (el && currentScreen.stream) el.srcObject = currentScreen.stream; }}
            />
            
            {/* Информация о владельце */}
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-sm">
              <span className="text-foreground text-sm font-medium">{getScreenOwnerName()}</span>
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

            {/* Кнопка-шторка для сворачивания списка участников */}
            <button
              onClick={() => setIsParticipantsVisible(!isParticipantsVisible)}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-background/95 backdrop-blur-sm hover:bg-background border border-border text-foreground px-6 py-1.5 rounded-full transition shadow-lg z-10"
              title={isParticipantsVisible ? 'Скрыть участников' : 'Показать участников'}
            >
              {isParticipantsVisible ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Полоса с камерами (режим зависит от наличия screen share) */}
        <div 
          className={`overflow-hidden pb-14 transition-all duration-300 ${
            hasScreenShare && !isParticipantsVisible ? 'h-0' : 'flex-1'
          }`}
        >
          <VideoGrid
            localStream={localStream}
            remoteVideoStreams={remoteVideoStreams}
            remoteAudioStreams={remoteAudioStreams}
            isCameraEnabled={isCameraEnabled}
            participants={participants}
            isScreenSharing={hasScreenShare}
          />
        </div>
      </div>

      <ControlPanel
        isCameraEnabled={isCameraEnabled}
        isMicrophoneEnabled={isMicrophoneEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        onToggleCamera={toggleCamera}
        onToggleMicrophone={toggleMicrophone}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
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
      />
    </div>
  );
};

export default CallPage;

