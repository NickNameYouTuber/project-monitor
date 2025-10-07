import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface PreCallSetupProps {
  roomId: string;
  onJoin: (options: { cameraEnabled: boolean; microphoneEnabled: boolean; guestName?: string }) => void;
}

const PreCallSetup: React.FC<PreCallSetupProps> = ({ roomId, onJoin }) => {
  const { user } = useAuth();
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const initPreview = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: microphoneEnabled,
        });
        
        if (mounted) {
          streamRef.current = stream;
          setPreviewStream(stream);
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
          }
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        console.warn('Медиа устройства недоступны для превью:', error);
        if (mounted) {
          const emptyStream = new MediaStream();
          streamRef.current = emptyStream;
          setPreviewStream(emptyStream);
        }
      }
    };

    initPreview();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraEnabled, microphoneEnabled]);

  const handleJoin = () => {
    if (!user && !guestName.trim()) {
      return;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    onJoin({ 
      cameraEnabled, 
      microphoneEnabled,
      guestName: !user ? guestName.trim() : undefined
    });
  };

  const displayName = user?.username || guestName || 'Гость';
  const hasVideo = previewStream && previewStream.getVideoTracks().length > 0 && cameraEnabled;

  return (
    <div className="h-full flex flex-col bg-background p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Присоединиться к звонку</h1>
        <p className="text-sm text-muted-foreground">
          Настройте камеру и микрофон перед входом
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Левая плитка - превью камеры */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col">
          <h2 className="text-lg font-medium mb-4">Превью</h2>
          
          <div className="flex-1 flex items-center justify-center mb-4">
            <div className="relative w-full rounded-lg overflow-hidden border border-border bg-muted" style={{ aspectRatio: '16/9' }}>
              {hasVideo ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl text-muted-foreground font-semibold">
                      {displayName[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Контролы */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              variant={cameraEnabled ? "default" : "destructive"}
              size="lg"
              className="flex-1"
            >
              {cameraEnabled ? <Video className="w-5 h-5 mr-2" /> : <VideoOff className="w-5 h-5 mr-2" />}
              {cameraEnabled ? 'Камера вкл' : 'Камера выкл'}
            </Button>

            <Button
              onClick={() => setMicrophoneEnabled(!microphoneEnabled)}
              variant={microphoneEnabled ? "default" : "destructive"}
              size="lg"
              className="flex-1"
            >
              {microphoneEnabled ? <Mic className="w-5 h-5 mr-2" /> : <MicOff className="w-5 h-5 mr-2" />}
              {microphoneEnabled ? 'Микрофон вкл' : 'Микрофон выкл'}
            </Button>
          </div>
        </div>

        {/* Правая плитка - информация о звонке */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col">
          <h2 className="text-lg font-medium mb-4">Информация о звонке</h2>
          
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">ID комнаты</Label>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono">{roomId}</code>
              </div>
            </div>

            {!user && (
              <div className="space-y-2">
                <Label htmlFor="guestName">Ваше имя</Label>
                <Input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Введите имя"
                  className="w-full"
                />
              </div>
            )}

            {user && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Вы входите как</p>
                <p className="font-semibold text-lg">{user.username}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {cameraEnabled ? <Video className="w-5 h-5 text-primary" /> : <VideoOff className="w-5 h-5 text-muted-foreground" />}
                  <span className="text-sm font-medium">Камера</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${cameraEnabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {cameraEnabled ? 'Вкл' : 'Выкл'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {microphoneEnabled ? <Mic className="w-5 h-5 text-primary" /> : <MicOff className="w-5 h-5 text-muted-foreground" />}
                  <span className="text-sm font-medium">Микрофон</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${microphoneEnabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {microphoneEnabled ? 'Вкл' : 'Выкл'}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleJoin}
            disabled={!user && !guestName.trim()}
            size="lg"
            className="w-full mt-6"
          >
            <Phone className="w-5 h-5 mr-2" />
            Присоединиться к звонку
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreCallSetup;