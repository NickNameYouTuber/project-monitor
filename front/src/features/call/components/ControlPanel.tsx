import React from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, MessageSquare, PhoneOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

interface ControlPanelProps {
  isCameraEnabled: boolean;
  isMicrophoneEnabled: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  onToggleCamera: () => void;
  onToggleMicrophone: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  roomId: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isCameraEnabled,
  isMicrophoneEnabled,
  isScreenSharing,
  isChatOpen,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  onToggleChat,
  roomId,
}) => {
  const navigate = useNavigate();

  const handleLeaveCall = () => {
    if (window.confirm('Вы уверены, что хотите покинуть звонок?')) {
      navigate('/projects');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Информация о комнате */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <p className="text-sm font-medium">Комната</p>
              <p className="text-xs text-muted-foreground font-mono">{roomId}</p>
            </div>
          </div>

          {/* Основные контролы */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onToggleMicrophone}
              variant={isMicrophoneEnabled ? "default" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
              title={isMicrophoneEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
            >
              {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            <Button
              onClick={onToggleCamera}
              variant={isCameraEnabled ? "default" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
              title={isCameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
            >
              {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button
              onClick={onToggleScreenShare}
              variant={isScreenSharing ? "secondary" : "outline"}
              size="lg"
              className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
              title={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>

            <Button
              onClick={onToggleChat}
              variant={isChatOpen ? "secondary" : "outline"}
              size="lg"
              className="rounded-full w-12 h-12 sm:w-14 sm:h-14 relative"
              title="Чат"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            <div className="w-px h-10 bg-border mx-2" />

            <Button
              onClick={handleLeaveCall}
              variant="destructive"
              size="lg"
              className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
              title="Покинуть звонок"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>

          {/* Пустое место для симметрии */}
          <div className="w-32 hidden sm:block" />
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;