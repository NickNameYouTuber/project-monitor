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
    <div className="h-screen flex bg-background">
      {/* Левая часть - превью видео */}
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
        <div className="w-full max-w-2xl">
          <div className="relative bg-card rounded-lg overflow-hidden border border-border shadow-lg" style={{ aspectRatio: '16/9' }}>
            {hasVideo ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-3xl text-muted-foreground font-semibold">
                    {displayName[0].toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            
            {/* Контролы поверх превью */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <Button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                variant={cameraEnabled ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-14 h-14"
              >
                {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                onClick={() => setMicrophoneEnabled(!microphoneEnabled)}
                variant={microphoneEnabled ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-14 h-14"
              >
                {microphoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Правая часть - информация и кнопка входа */}
      <div className="w-96 bg-card border-l border-border flex flex-col">
        <div className="flex-1 p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Присоединиться к звонку</h1>
            <p className="text-sm text-muted-foreground">Комната: <span className="font-mono">{roomId}</span></p>
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

          {user && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Вы входите как</p>
              <p className="font-semibold">{user.username}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border">
          <Button
            onClick={handleJoin}
            disabled={!user && !guestName.trim()}
            size="lg"
            className="w-full"
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