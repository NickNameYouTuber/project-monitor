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
    <div className="h-full flex items-center justify-center bg-background p-6">
      <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Левая плитка - только превью камеры */}
        <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ height: '400px' }}>
          <div className="relative w-full h-full bg-muted">
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

        {/* Правая плитка - информация и контролы */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col justify-between" style={{ height: '400px' }}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Информация о звонке</h2>
            
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
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Вы входите как</p>
                <p className="font-medium text-base">{user.username}</p>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                variant={cameraEnabled ? "default" : "outline"}
                className="w-full justify-start"
              >
                {cameraEnabled ? <Video className="w-4 h-4 mr-2" /> : <VideoOff className="w-4 h-4 mr-2" />}
                Камера {cameraEnabled ? 'вкл' : 'выкл'}
              </Button>

              <Button
                onClick={() => setMicrophoneEnabled(!microphoneEnabled)}
                variant={microphoneEnabled ? "default" : "outline"}
                className="w-full justify-start"
              >
                {microphoneEnabled ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                Микрофон {microphoneEnabled ? 'вкл' : 'выкл'}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleJoin}
            disabled={!user && !guestName.trim()}
            size="lg"
            className="w-full"
          >
            Присоединиться к звонку
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreCallSetup;