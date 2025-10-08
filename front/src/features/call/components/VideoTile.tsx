import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Hand } from 'lucide-react';

interface VideoTileProps {
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  isLocal: boolean;
  isCameraEnabled?: boolean;
  isMicEnabled?: boolean;
  username?: string;
  isGuest?: boolean;
  isSpeaking?: boolean;
  isHandRaised?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({ 
  videoStream, 
  audioStream,
  isLocal, 
  isCameraEnabled = true,
  isMicEnabled = true,
  username,
  isGuest = false,
  isSpeaking = false,
  isHandRaised = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIsSpeakingRef = useRef<boolean>(false);
  const lastIsHandRaisedRef = useRef<boolean>(false);
  const [showFrozenFrame, setShowFrozenFrame] = useState(false);
  const [isStreamLost, setIsStreamLost] = useState(false);

  // Захват последнего кадра в canvas
  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      if (videoStream && videoStream.getVideoTracks().length > 0 && isCameraEnabled) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.play().catch((error) => {
          console.warn('Не удалось воспроизвести видео автоматически:', error);
        });

        // Запускаем захват кадров каждые 500ms
        frameIntervalRef.current = setInterval(captureFrame, 500);

        // Сбрасываем состояние замороженного кадра
        setShowFrozenFrame(false);
        setIsStreamLost(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        videoRef.current.srcObject = null;
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
      }
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [videoStream, isCameraEnabled]);

  // Отслеживание потери стрима
  useEffect(() => {
    if (!videoStream || !isCameraEnabled) return;

    const tracks = videoStream.getVideoTracks();
    if (tracks.length === 0) return;

    const track = tracks[0];

    const handleTrackEnded = () => {
      console.log('🔴 Трек завершен, показываем замороженный кадр');
      setShowFrozenFrame(true);
      
      // Через 10 секунд показываем placeholder
      timeoutRef.current = setTimeout(() => {
        console.log('⏱️ 10 секунд прошло, показываем placeholder');
        setIsStreamLost(true);
      }, 10000);
    };

    const handleTrackMute = () => {
      console.log('🔇 Трек замучен, показываем замороженный кадр');
      setShowFrozenFrame(true);
      
      timeoutRef.current = setTimeout(() => {
        setIsStreamLost(true);
      }, 10000);
    };

    const handleTrackUnmute = () => {
      console.log('🔊 Трек размучен, восстанавливаем видео');
      setShowFrozenFrame(false);
      setIsStreamLost(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    track.addEventListener('ended', handleTrackEnded);
    track.addEventListener('mute', handleTrackMute);
    track.addEventListener('unmute', handleTrackUnmute);

    return () => {
      track.removeEventListener('ended', handleTrackEnded);
      track.removeEventListener('mute', handleTrackMute);
      track.removeEventListener('unmute', handleTrackUnmute);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [videoStream, isCameraEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      if (audioStream && audioStream.getAudioTracks().length > 0 && !isLocal) {
        audioRef.current.srcObject = audioStream;
        audioRef.current.play().catch((error) => {
          console.warn('Не удалось воспроизвести удаленное аудио автоматически:', error);
        });
      } else {
        audioRef.current.srcObject = null;
      }
    }
  }, [audioStream, isLocal]);

  // Обновляем обводку через прямое изменение DOM БЕЗ ре-рендера React
  // Используем useLayoutEffect чтобы изменения применялись синхронно
  useEffect(() => {
    // Проверяем изменились ли значения (чтобы не обновлять DOM без необходимости)
    if (lastIsSpeakingRef.current === isSpeaking && lastIsHandRaisedRef.current === isHandRaised) {
      return;
    }
    
    lastIsSpeakingRef.current = isSpeaking;
    lastIsHandRaisedRef.current = isHandRaised;
    
    if (containerRef.current) {
      if (isHandRaised) {
        containerRef.current.className = 'relative w-full h-full bg-card rounded-lg overflow-hidden group shadow-sm transition-all duration-200 border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]';
      } else if (isSpeaking) {
        containerRef.current.className = 'relative w-full h-full bg-card rounded-lg overflow-hidden group shadow-sm transition-all duration-200 border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]';
      } else {
        containerRef.current.className = 'relative w-full h-full bg-card rounded-lg overflow-hidden group shadow-sm transition-all duration-200 border border-border';
      }
    }
  });

  const displayName = isLocal ? 'Вы' : username || 'Участник';
  const hasVideo = videoStream && videoStream.getVideoTracks().length > 0 && isCameraEnabled;
  const hasAudio = audioStream && audioStream.getAudioTracks().length > 0;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-card rounded-lg overflow-hidden group shadow-sm transition-all duration-200 border border-border"
    >
      <audio ref={audioRef} autoPlay muted={isLocal} style={{ display: 'none' }} />
      
      {/* Canvas для замороженного кадра (скрыт по умолчанию) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover ${showFrozenFrame && !isStreamLost ? 'block' : 'hidden'}`}
      />
      
      {hasVideo && !isStreamLost ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${showFrozenFrame ? 'opacity-0' : 'opacity-100'}`}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-muted">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-2xl sm:text-3xl text-muted-foreground font-semibold">
              {displayName[0].toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      {/* Индикатор восстановления соединения */}
      {showFrozenFrame && !isStreamLost && (
        <div className="absolute top-2 left-2 bg-yellow-600/90 px-2 py-1 rounded-lg">
          <span className="text-white text-xs font-medium">Восстановление...</span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/80 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg">
        <span className="text-white text-xs sm:text-sm font-medium flex items-center gap-1.5">
          {(!isCameraEnabled || !hasVideo) && (
            <VideoOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
          )}
          {!isLocal && !isMicEnabled && (
            <MicOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
          )}
          {displayName}
          {isGuest && !isLocal && (
            <span className="text-gray-400 text-xs">(Гость)</span>
          )}
        </span>
      </div>

      {isLocal && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-blue-600 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-white text-xs font-semibold">
          ВЫ
        </div>
      )}

      {/* Иконка поднятой руки */}
      {isHandRaised && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-yellow-500 p-2 rounded-full shadow-lg animate-pulse">
          <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      )}
    </div>
  );
};

// Мемоизируем компонент, но isSpeaking обновляем через ref без ре-рендера основного контента
export default React.memo(VideoTile, (prevProps, nextProps) => {
  // Не ре-рендерим при изменении только isSpeaking (обработаем через useEffect)
  return (
    prevProps.videoStream === nextProps.videoStream &&
    prevProps.audioStream === nextProps.audioStream &&
    prevProps.isLocal === nextProps.isLocal &&
    prevProps.isCameraEnabled === nextProps.isCameraEnabled &&
    prevProps.isMicEnabled === nextProps.isMicEnabled &&
    prevProps.username === nextProps.username &&
    prevProps.isGuest === nextProps.isGuest &&
    prevProps.isHandRaised === nextProps.isHandRaised
    // Специально НЕ сравниваем isSpeaking - оно обновится через useEffect
  );
});

