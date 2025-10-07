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
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={onToggleMicrophone}
            variant={isMicrophoneEnabled ? "default" : "destructive"}
            size="icon"
            className="rounded-full w-10 h-10"
            title={isMicrophoneEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
          >
            {isMicrophoneEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          <Button
            onClick={onToggleCamera}
            variant={isCameraEnabled ? "default" : "destructive"}
            size="icon"
            className="rounded-full w-10 h-10"
            title={isCameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
          >
            {isCameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>

          <Button
            onClick={onToggleScreenShare}
            variant={isScreenSharing ? "secondary" : "outline"}
            size="icon"
            className="rounded-full w-10 h-10"
            title={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </Button>

          <Button
            onClick={onToggleChat}
            variant={isChatOpen ? "secondary" : "outline"}
            size="icon"
            className="rounded-full w-10 h-10"
            title="Чат"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          <div className="w-px h-8 bg-border mx-1" />

          <Button
            onClick={handleLeaveCall}
            variant="destructive"
            size="icon"
            className="rounded-full w-10 h-10"
            title="Покинуть звонок"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;