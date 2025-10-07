import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

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
  const isGuest = !user;

  useEffect(() => {
    let mounted = true;
    
    const initPreview = async () => {
      // Останавливаем предыдущий поток через ref
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
          // Если компонент размонтирован, останавливаем поток
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

  const handleToggleCamera = () => {
    setCameraEnabled(prev => !prev);
  };

  const handleToggleMicrophone = () => {
    setMicrophoneEnabled(prev => !prev);
  };

  const handleJoin = () => {
    if (isGuest && !guestName.trim()) {
      window.alert('Пожалуйста, введите ваше имя');
      return;
    }
    
    // Останавливаем preview поток через ref
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    onJoin({ 
      cameraEnabled, 
      microphoneEnabled,
      guestName: isGuest ? guestName.trim() : undefined
    });
  };

  const displayName = user?.username || guestName || 'Гость';
  const hasVideo = previewStream && previewStream.getVideoTracks().length > 0 && cameraEnabled;

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-md sm:max-w-lg md:max-w-2xl my-auto">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 text-center">
            Готовы присоединиться?
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-1 text-center">
            Настройте камеру и микрофон перед входом
          </p>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="w-full aspect-video mb-4 sm:mb-6">
            <div className="relative w-full h-full bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#2a2a2a]">
              {hasVideo ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#2a2a2a] rounded-full flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl text-gray-400 font-semibold">
                      {displayName[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium flex items-center gap-2">
                  {!cameraEnabled && (
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A3.001 3.001 0 0018 13V7a3 3 0 00-3-3H8.414L3.707 2.293zM13 9.586L8.414 5H15a1 1 0 011 1v6c0 .173-.046.334-.127.473L13 9.586z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="truncate max-w-[200px]">{displayName}</span>
                </span>
              </div>

              <div className="absolute top-3 right-3 bg-blue-600 px-2.5 py-1 rounded-lg text-white text-xs font-semibold">
                ПРЕВЬЮ
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-5">
            <button
              onClick={handleToggleMicrophone}
              className={`p-4 rounded-xl transition ${
                microphoneEnabled 
                  ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] active:bg-[#4a4a4a] text-white' 
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
              }`}
              title={microphoneEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
            >
              {microphoneEnabled ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={handleToggleCamera}
              className={`p-4 rounded-xl transition ${
                cameraEnabled 
                  ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] active:bg-[#4a4a4a] text-white' 
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
              }`}
              title={cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
            >
              {cameraEnabled ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A3.001 3.001 0 0018 13V7a3 3 0 00-3-3H8.414L3.707 2.293zM13 9.586L8.414 5H15a1 1 0 011 1v6c0 .173-.046.334-.127.473L13 9.586z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {isGuest && (
            <div>
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-400 mb-2">
                Ваше имя
              </label>
              <input
                type="text"
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Введите ваше имя"
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition"
                maxLength={30}
              />
            </div>
          )}

          <button
            onClick={handleJoin}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3.5 rounded-xl font-semibold text-lg transition"
          >
            Присоединиться к звонку
          </button>

          <div className="text-center pt-2">
            <p className="text-gray-500 text-xs">
              ID комнаты: <code className="bg-[#2a2a2a] text-gray-400 px-2 py-1 rounded font-mono">{roomId.slice(0, 8)}...</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreCallSetup;

